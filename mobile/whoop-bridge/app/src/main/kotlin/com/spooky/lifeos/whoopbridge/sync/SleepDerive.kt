package com.spooky.lifeos.whoopbridge.sync

import com.spooky.lifeos.whoopbridge.db.LocalDb
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

/**
 * Consolidates per-second `sleep_state` samples (Gen5HistorySample.sleepState — WAKE/STILL/
 * SLEEP/UP, decoded off every sample already but discarded until now) into contiguous
 * same-stage runs, shrinking a hypothetical full night from ~28,800 1Hz samples down to a
 * few dozen segments before upload. Session-boundary detection (deciding where one full
 * night starts/ends, possibly across several sync batches) deliberately does NOT happen
 * here — that needs the user's whole history to do correctly, which only the server can
 * see; see LifeOS's lib/sleep/service.ts `recordSleepSegments`. This only groups runs
 * within one derive window, mirroring `DailyDerive`'s own `latestSampleSec()`-anchored
 * windowing exactly (a first sync after a gap has real past timestamps, not wall-clock
 * "now" — see LocalDb.latestSampleSec's doc for how that was found live).
 */
object SleepDerive {
    data class StageSegment(val stage: String, val startedAtSec: Long, val endedAtSec: Long)

    /**
     * Pure — no Android/db dependency, unit-testable the same way `DailyDerive.computeRmssd`
     * is. Takes (timestamp, stage) pairs in chronological order; returns one segment per
     * contiguous run of the same stage. A single out-of-order or duplicate-timestamp sample
     * doesn't split a run unless the stage value itself actually changes.
     */
    fun computeSegments(samplesInOrder: List<Pair<Long, String>>): List<StageSegment> {
        if (samplesInOrder.isEmpty()) return emptyList()

        val segments = mutableListOf<StageSegment>()
        var currentStage = samplesInOrder.first().second
        var segmentStartSec = samplesInOrder.first().first
        var lastSec = samplesInOrder.first().first

        for (i in 1 until samplesInOrder.size) {
            val (sec, stage) = samplesInOrder[i]
            if (stage != currentStage) {
                segments.add(StageSegment(currentStage, segmentStartSec, lastSec))
                currentStage = stage
                segmentStartSec = sec
            }
            lastSec = sec
        }
        segments.add(StageSegment(currentStage, segmentStartSec, lastSec))
        return segments
    }

    fun deriveSegments(db: LocalDb): JSONArray {
        val out = JSONArray()
        val latestSec = db.latestSampleSec() ?: return out
        val windowStart = latestSec - 3600 // same hour-of-data window as DailyDerive

        val samplesInOrder = db.samplesInRange(windowStart, latestSec)
            .mapNotNull { s -> s.sleepState?.let { s.tsSec to it.lowercase() } }
        if (samplesInOrder.isEmpty()) return out

        for (segment in computeSegments(samplesInOrder)) {
            out.put(
                JSONObject()
                    .put("stage", segment.stage)
                    .put("startedAt", Instant.ofEpochSecond(segment.startedAtSec).toString())
                    .put("endedAt", Instant.ofEpochSecond(segment.endedAtSec).toString()),
            )
        }
        return out
    }
}

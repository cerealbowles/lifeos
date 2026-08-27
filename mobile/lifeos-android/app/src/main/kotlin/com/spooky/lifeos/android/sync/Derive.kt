package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.db.WhoopLocalDb
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import kotlin.math.round
import kotlin.math.sqrt

/**
 * Turns accumulated local raw_samples into LifeOS-shaped readings. v1 scope per the
 * plan: raw vitals only (heart rate, HRV) — no recovery/strain/sleep scoring, since
 * that logic (openstrap_analytics) was explicitly not ported to Kotlin.
 *
 * RMSSD (root mean square of successive R-R interval differences) is a standard,
 * unambiguous published HRV formula — but naively flattening every RR value across an
 * hour and diffing consecutive entries in that list is NOT the same as diffing
 * consecutive *heartbeats*: found live (real device data, 2026-08-25) that WHOOP's
 * gen5 strap only reports an RR value on ~15% of seconds, so most "successive" pairs
 * in that flattened list actually span an unrecorded gap of one or more real beats —
 * inflating RMSSD to 400-560ms (physiological range is roughly 20-100ms). Fixed by
 * porting OpenStrap/edge's real, verified artifact-rejection pipeline
 * (lib/compute/derivation_engine.dart's dayHrvCurve) rather than inventing one:
 * a plausibility gate on raw RR values, the published Malik 20% successive-difference
 * rule to drop ectopic/missed-beat pairs, a minimum valid-pair count before trusting
 * the result at all, and a final sanity ceiling. Verified against this device's own
 * real backlog: 561.6ms (naive) -> 72.4ms (this algorithm) on the same hour of data.
 */
object DailyDerive {
    // OpenStrap/edge's dayHrvCurve bounds, verified against its real source rather than
    // guessed: RR plausibility is tighter than the raw protocol's own 200-2500ms
    // transmission range (Gen5Records.kt), and a successive pair is only trusted if its
    // beat-to-beat change is small — a jump bigger than 20% of the previous interval
    // (or 200ms absolute) is treated as an ectopic/missed beat, not a real pair.
    private const val RR_PLAUSIBLE_MIN_MS = 300
    private const val RR_PLAUSIBLE_MAX_MS = 2000
    private const val MALIK_RELATIVE_THRESHOLD = 0.20
    private const val MALIK_ABSOLUTE_THRESHOLD_MS = 200
    private const val MIN_VALID_PAIRS = 8
    private const val RMSSD_SANITY_CEILING_MS = 220.0

    data class RmssdResult(val rmssdMs: Double, val validPairs: Int, val plausibleRrCount: Int)

    /**
     * Pure — no Android/db dependency — so this is unit-testable the same way the protocol
     * layer's CRC/framing math is, unlike `deriveForNow` itself (needs a real WhoopLocalDb).
     * Takes every RR value from every sample in a window, in chronological order; returns
     * null if the window doesn't have enough trustworthy data to report a value at all
     * (fewer than [MIN_VALID_PAIRS] valid pairs, or the result is still above the sanity
     * ceiling after filtering) rather than a number that isn't actually reliable.
     */
    fun computeRmssd(rrValuesInOrder: List<Int>): RmssdResult? {
        val plausibleRr = rrValuesInOrder.filter { it in RR_PLAUSIBLE_MIN_MS..RR_PLAUSIBLE_MAX_MS }

        var sumSquaredDiffs = 0.0
        var validPairs = 0
        for (i in 1 until plausibleRr.size) {
            val diff = (plausibleRr[i] - plausibleRr[i - 1]).toDouble()
            // Malik 20% rule — a jump this large between "successive" entries means
            // they weren't actually consecutive heartbeats (a gap swallowed a real
            // beat), not that the heart genuinely changed pace that fast. Skip the
            // pair rather than let it corrupt the sum.
            if (kotlin.math.abs(diff) > MALIK_RELATIVE_THRESHOLD * plausibleRr[i - 1] || kotlin.math.abs(diff) > MALIK_ABSOLUTE_THRESHOLD_MS) {
                continue
            }
            sumSquaredDiffs += diff * diff
            validPairs++
        }

        if (validPairs < MIN_VALID_PAIRS) return null
        val rmssd = round(sqrt(sumSquaredDiffs / validPairs) * 10) / 10
        if (rmssd > RMSSD_SANITY_CEILING_MS) return null
        return RmssdResult(rmssdMs = rmssd, validPairs = validPairs, plausibleRrCount = plausibleRr.size)
    }

    // heart_rate/skin_temp bucket size — was 3600s (1hr) for both this and HRV together, which
    // meant a chart could never show more than one point per hour no matter how often derive
    // ran. HR is reported ~every second with no filtering needed, so it can bucket this fine.
    private const val HR_BUCKET_SECONDS = 60L
    // HRV can't bucket this fine: the strap only reports an RR interval on ~15% of seconds, and
    // computeRmssd needs MIN_VALID_PAIRS before it'll trust a result at all — a 60s bucket
    // mostly returns null. Instead HRV is a trailing rolling window recomputed at the end of
    // every HR bucket, so it still updates every derive pass, just smoothed over enough RR
    // samples to be reliable (~5 min gets comfortably past MIN_VALID_PAIRS in practice).
    private const val HRV_LOOKBACK_SECONDS = 300L

    /**
     * Derives heart_rate/skin_temp per HR_BUCKET_SECONDS-of-DATA bucket, and hrv per trailing
     * HRV_LOOKBACK_SECONDS window ending at each bucket, across every sample not yet covered by
     * a previous derive pass (WhoopLocalDb.getLastDerivedSec) — not just the trailing window off
     * the latest sample. A single fixed trailing window silently dropped everything older on
     * every sync that fell behind — routine in practice, since a background sync needs an
     * active BLE connection and WorkManager's 15-min periodic request is frequently delayed by
     * Android Doze far past that. Bucketing (rather than one giant window for the whole gap)
     * keeps each reading's cadence — and HRV's Malik-filtered pair count — the same as if a
     * sync had actually run on schedule, instead of flattening a multi-hour backlog into one
     * point.
     */
    fun deriveForNow(db: WhoopLocalDb): JSONArray {
        val readings = JSONArray()
        // Anchor on the latest sample actually present, NOT wall-clock now — a first
        // sync (or any sync after a gap) drains the strap's own backlog, and those
        // records carry real PAST timestamps from when they were recorded, not close
        // to "now." See WhoopLocalDb.latestSampleSec's doc for how this was found live.
        val latestSec = db.latestSampleSec() ?: return readings
        // No watermark yet (first-ever sync) — nothing to widen from, so fall back to
        // the same trailing-bucket window as before.
        val windowStart = (db.getLastDerivedSec() ?: (latestSec - HR_BUCKET_SECONDS)) + 1
        if (windowStart > latestSec) return readings

        var bucketStart = windowStart
        while (bucketStart <= latestSec) {
            val bucketEnd = minOf(bucketStart + HR_BUCKET_SECONDS - 1, latestSec)
            deriveHeartRateAndSkinTemp(db, bucketStart, bucketEnd, readings)
            deriveHrv(db, bucketEnd, readings)
            bucketStart = bucketEnd + 1
        }

        return readings
    }

    private fun deriveHeartRateAndSkinTemp(db: WhoopLocalDb, bucketStart: Long, bucketEnd: Long, readings: JSONArray) {
        val samples = db.samplesInRange(bucketStart, bucketEnd)
        if (samples.isEmpty()) return

        samples.lastOrNull { it.hr != null }?.let { s ->
            readings.put(
                JSONObject()
                    .put("type", "heart_rate")
                    .put("value", s.hr)
                    .put("unit", "bpm")
                    .put("measuredAt", Instant.ofEpochSecond(s.tsSec).toString()),
            )
        }

        // Decoded off every gen5 sample already (Gen5HistorySample.skinTempCOrNull) —
        // previously logged to the on-screen debug text and thrown away. Reuses this same
        // readings upload path exactly like heart_rate above; LifeOS already has a
        // "skin_temp" slot in WHOOP_CARD_TYPES with no data ever received for it.
        samples.lastOrNull { it.skinTempC != null }?.let { s ->
            readings.put(
                JSONObject()
                    .put("type", "skin_temp")
                    .put("value", s.skinTempC)
                    .put("unit", "C")
                    .put("measuredAt", Instant.ofEpochSecond(s.tsSec).toString()),
            )
        }
    }

    private fun deriveHrv(db: WhoopLocalDb, atSec: Long, readings: JSONArray) {
        val samples = db.samplesInRange(atSec - HRV_LOOKBACK_SECONDS + 1, atSec)
        if (samples.isEmpty()) return
        val rrValuesInOrder = samples.flatMap { it.rrMs }
        computeRmssd(rrValuesInOrder)?.let { result ->
            readings.put(
                JSONObject()
                    .put("type", "hrv")
                    .put("value", result.rmssdMs)
                    .put("unit", "ms")
                    .put("measuredAt", Instant.ofEpochSecond(atSec).toString())
                    .put(
                        "metadata",
                        JSONObject()
                            .put("method", "rmssd_malik_filtered")
                            .put("valid_pairs", result.validPairs)
                            .put("plausible_rr_count", result.plausibleRrCount),
                    ),
            )
        }
    }
}

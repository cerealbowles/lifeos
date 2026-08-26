package com.spooky.lifeos.whoopbridge.sync

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SleepDeriveTest {
    @Test
    fun `empty input produces no segments`() {
        assertEquals(emptyList(), SleepDerive.computeSegments(emptyList()))
    }

    @Test
    fun `a single sample produces one zero-length segment`() {
        val segments = SleepDerive.computeSegments(listOf(1000L to "wake"))
        assertEquals(1, segments.size)
        assertEquals(SleepDerive.StageSegment("wake", 1000L, 1000L), segments[0])
    }

    @Test
    fun `a clean single-stage run produces exactly one segment spanning first to last`() {
        val samples = (0 until 10).map { i -> (1000L + i) to "sleep" }
        val segments = SleepDerive.computeSegments(samples)
        assertEquals(listOf(SleepDerive.StageSegment("sleep", 1000L, 1009L)), segments)
    }

    @Test
    fun `stage transitions split into separate contiguous segments`() {
        // wake(1000-1002) -> still(1003-1005) -> sleep(1006-1010)
        val samples = listOf(
            1000L to "wake", 1001L to "wake", 1002L to "wake",
            1003L to "still", 1004L to "still", 1005L to "still",
            1006L to "sleep", 1007L to "sleep", 1008L to "sleep", 1009L to "sleep", 1010L to "sleep",
        )
        val segments = SleepDerive.computeSegments(samples)
        assertEquals(
            listOf(
                SleepDerive.StageSegment("wake", 1000L, 1002L),
                SleepDerive.StageSegment("still", 1003L, 1005L),
                SleepDerive.StageSegment("sleep", 1006L, 1010L),
            ),
            segments,
        )
    }

    @Test
    fun `a brief return to a prior stage produces its own segment, not merged with the earlier one`() {
        // sleep -> wake (brief) -> sleep again: two separate "sleep" segments, not one —
        // this is what lets the hypnogram show a real momentary waking, and it's exactly
        // the kind of transition the server-side session grouping (60 min gap threshold)
        // is deliberately more forgiving about than this sample-level grouping is.
        val samples = listOf(
            1000L to "sleep", 1001L to "sleep",
            1002L to "wake",
            1003L to "sleep", 1004L to "sleep",
        )
        val segments = SleepDerive.computeSegments(samples)
        assertEquals(
            listOf(
                SleepDerive.StageSegment("sleep", 1000L, 1001L),
                SleepDerive.StageSegment("wake", 1002L, 1002L),
                SleepDerive.StageSegment("sleep", 1003L, 1004L),
            ),
            segments,
        )
    }

    @Test
    fun `sparse gaps within one stage do not fragment the segment`() {
        // Real gen5 sampling isn't perfectly 1Hz-dense for every field — a few missing
        // seconds mid-run of the same stage should still collapse into one segment, since
        // grouping is purely "did the stage value change," not "was every second present."
        val samples = listOf(1000L to "sleep", 1005L to "sleep", 1050L to "sleep")
        val segments = SleepDerive.computeSegments(samples)
        assertEquals(listOf(SleepDerive.StageSegment("sleep", 1000L, 1050L)), segments)
    }

    @Test
    fun `a realistic short night produces a plausible small segment count`() {
        // ~2 hours: 20 min wake, 90 min sleep, 10 min wake — shaped like real WHOOP data
        // (mostly-still runs, not literally every state), not asserting exact values.
        val samples = buildList {
            for (t in 0 until 20 * 60) add((1_000_000L + t) to "wake")
            for (t in 0 until 90 * 60) add((1_001_200L + t) to "sleep")
            for (t in 0 until 10 * 60) add((1_006_600L + t) to "wake")
        }
        val segments = SleepDerive.computeSegments(samples)
        assertEquals(3, segments.size)
        assertTrue(segments[0].stage == "wake" && segments[1].stage == "sleep" && segments[2].stage == "wake")
    }
}

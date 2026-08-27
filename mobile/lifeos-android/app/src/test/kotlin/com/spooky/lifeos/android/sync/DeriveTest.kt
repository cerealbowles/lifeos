package com.spooky.lifeos.android.sync

import kotlin.math.round
import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Regression coverage for the bug found live on 2026-08-25: naively RMSSD-ing every RR value
 * in a window (no artifact rejection) reported 561.6ms on real device data — physiologically
 * impossible (normal RMSSD is roughly 20-100ms) — because WHOOP's gen5 strap only reports an
 * RR value on ~15% of seconds, so most "successive" list entries actually spanned an
 * unrecorded gap of one or more real beats, not a real consecutive pair. Fixed by porting
 * OpenStrap/edge's real artifact-rejection pipeline (verified against its actual source, not
 * guessed) — these tests pin that fix down the same way the protocol layer's CRC/framing
 * tests pin down real captured byte fixtures.
 */
class DeriveTest {
    @Test
    fun `clean RR series with only small successive changes produces a normal physiological RMSSD`() {
        // All beat-to-beat changes are well under the Malik 20%/200ms thresholds — every
        // pair should be kept.
        val rr = listOf(800, 820, 810, 790, 805, 815, 800, 795, 810)
        val diffs = (1 until rr.size).map { (rr[it] - rr[it - 1]).toDouble() }
        val expected = round(sqrt(diffs.sumOf { it * it } / diffs.size) * 10) / 10

        val result = DailyDerive.computeRmssd(rr)

        assertEquals(expected, result?.rmssdMs)
        assertEquals(8, result?.validPairs) // all 8 pairs kept
        assertTrue((result?.rmssdMs ?: 0.0) < 100.0, "expected a physiologically normal RMSSD, got ${result?.rmssdMs}")
    }

    @Test
    fun `a single gap-induced jump is excluded by the Malik rule instead of corrupting the result`() {
        // Same clean series as above, but longer (13 pairs, comfortably above
        // MIN_VALID_PAIRS even after 2 get rejected below), with one artifact spliced in:
        // 810 -> 1600 -> 805. 1600ms is deliberately still inside the 300-2000ms
        // plausibility gate (unlike 2400ms, which would just get dropped before pairing
        // even starts and wouldn't exercise the Malik rule at all) — this specifically
        // tests that a jump within the plausible range but too large to be a real
        // beat-to-beat change still gets caught. Both pairs touching 1600 should be
        // rejected (>20% jump and >200ms), leaving the result close to the clean baseline
        // rather than blown up by two ~790ms diffs.
        val clean = listOf(800, 820, 810, 790, 805, 815, 800, 795, 810, 800, 815, 805, 795, 810)
        val withArtifact = listOf(800, 820, 810, 1600, 805, 815, 800, 795, 810, 800, 815, 805, 795, 810)

        val cleanResult = DailyDerive.computeRmssd(clean)
        val artifactResult = DailyDerive.computeRmssd(withArtifact)

        assertTrue(cleanResult != null && artifactResult != null)
        // The two pairs touching the artifact (810->1600, 1600->805) are both dropped, so
        // only 11 of the 13 pairs remain — but the surviving RMSSD stays in the same
        // neighborhood as the clean series, not inflated into the hundreds.
        assertEquals(11, artifactResult.validPairs)
        assertTrue(
            artifactResult.rmssdMs < 2 * cleanResult.rmssdMs,
            "artifact should have been filtered out, not folded into the result: clean=${cleanResult.rmssdMs} artifact=${artifactResult.rmssdMs}",
        )
    }

    @Test
    fun `implausible raw RR values are dropped before pairing, not just clamped`() {
        // 50ms and 2600ms both fall outside the physiological plausibility gate
        // (300-2000ms) even though 2600 is inside the raw protocol's own wider
        // transmission range (200-2500ms per Gen5Records.kt) — they must never
        // reach the pairing step at all.
        val rr = listOf(50, 800, 820, 810, 2600, 790, 805, 815, 800, 795, 810)
        val result = DailyDerive.computeRmssd(rr)

        assertTrue(result != null)
        assertEquals(9, result.plausibleRrCount) // 11 values minus the two implausible ones
    }

    @Test
    fun `too few valid pairs returns null rather than an unreliable number`() {
        val rr = listOf(800, 820, 810) // only 2 pairs, well under MIN_VALID_PAIRS
        assertNull(DailyDerive.computeRmssd(rr))
    }

    @Test
    fun `empty or single-value input returns null`() {
        assertNull(DailyDerive.computeRmssd(emptyList()))
        assertNull(DailyDerive.computeRmssd(listOf(800)))
    }

    @Test
    fun `sparse real-world-shaped data no longer inflates RMSSD past the sanity ceiling`() {
        // Shaped like the actual bug: mostly-normal RR values with occasional large,
        // gap-induced jumps scattered through a longer series (the real device data was
        // ~15% RR coverage across an hour — this is a smaller proportional analog).
        val rr = buildList {
            repeat(20) { i ->
                add(750 + (i % 5) * 10) // gentle real variation, 750-790ms
                if (i % 4 == 0) add(2350) // periodic gap artifact near the protocol ceiling
            }
        }
        val result = DailyDerive.computeRmssd(rr)

        assertTrue(result != null, "expected enough clean pairs to survive filtering")
        assertTrue(result.rmssdMs <= 220.0, "must never report a non-physiological result: got ${result.rmssdMs}")
        assertTrue(result.rmssdMs < 50.0, "this series' real variation is gentle; filtered result should reflect that, got ${result.rmssdMs}")
    }
}

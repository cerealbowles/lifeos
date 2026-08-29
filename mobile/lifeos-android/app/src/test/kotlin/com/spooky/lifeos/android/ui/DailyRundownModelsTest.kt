package com.spooky.lifeos.android.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DailyRundownModelsTest {
    @Test
    fun `valid payload round-trips all fields`() {
        val json = """
            {
              "tone": "morning",
              "sentence": "Good morning, the weather is currently 68 degrees.",
              "segments": [
                { "text": "the weather is currently 68 degrees", "link": { "kind": "weather" } },
                { "text": "Cubs", "link": { "kind": "game", "gameKey": "mlb-CHC-LAD-2026-08-29T20:00:00Z" } }
              ],
              "detail": "It's currently 68 degrees."
            }
        """.trimIndent()

        val result = parseDailyRundown(json)

        assertEquals("morning", result?.tone)
        assertEquals("Good morning, the weather is currently 68 degrees.", result?.sentence)
        assertEquals("It's currently 68 degrees.", result?.detail)
        assertEquals(2, result?.segments?.size)
        assertEquals(RundownLink("weather", null), result?.segments?.get(0)?.link)
        assertEquals(RundownLink("game", "mlb-CHC-LAD-2026-08-29T20:00:00Z"), result?.segments?.get(1)?.link)
    }

    @Test
    fun `missing segments degrades to an empty list rather than throwing`() {
        val json = """{ "tone": "recap", "sentence": "All done.", "detail": "All done." }"""

        val result = parseDailyRundown(json)

        assertEquals("recap", result?.tone)
        assertTrue(result?.segments.isNullOrEmpty())
    }

    @Test
    fun `a malformed segment is skipped rather than throwing`() {
        val json = """
            {
              "sentence": "One good segment.",
              "segments": [
                { "text": "One good segment" },
                { "text": "good", "link": { "kind": "task" } }
              ]
            }
        """.trimIndent()

        val result = parseDailyRundown(json)

        // The first entry (no "link" object) is dropped; the second parses fine.
        assertEquals(1, result?.segments?.size)
        assertEquals("good", result?.segments?.get(0)?.text)
    }

    @Test
    fun `missing sentence returns null`() {
        assertNull(parseDailyRundown("""{ "tone": "morning" }"""))
    }
}

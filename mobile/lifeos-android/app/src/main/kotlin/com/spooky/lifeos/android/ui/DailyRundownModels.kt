package com.spooky.lifeos.android.ui

import org.json.JSONObject

/** Mirrors lib/today/rundown.ts's RundownLink/RundownSegment/DailyRundown exactly.
 *  `kind` is one of "weather" | "routines" | "task" | "game"; `gameKey` is only set for "game". */
data class RundownLink(val kind: String, val gameKey: String?)

/** `text` is the exact substring of the owning DailyRundown.sentence this segment covers. */
data class RundownSegment(val text: String, val link: RundownLink)

data class DailyRundown(val tone: String, val sentence: String, val segments: List<RundownSegment>, val detail: String)

/** Parses GET /api/rundown's JSON body directly (no envelope, unlike /api/weather/today). */
fun parseDailyRundown(jsonText: String): DailyRundown? {
    val root = JSONObject(jsonText)
    if (!root.has("sentence")) return null
    val sentence = root.getString("sentence")
    val segments = root.optJSONArray("segments")?.let { arr ->
        (0 until arr.length()).mapNotNull { i ->
            val s = arr.optJSONObject(i) ?: return@mapNotNull null
            val linkObj = s.optJSONObject("link") ?: return@mapNotNull null
            RundownSegment(
                text = s.optString("text"),
                link = RundownLink(
                    kind = linkObj.optString("kind"),
                    gameKey = linkObj.optString("gameKey").takeIf { linkObj.has("gameKey") && !linkObj.isNull("gameKey") },
                ),
            )
        }
    } ?: emptyList()
    return DailyRundown(
        tone = root.optString("tone", "morning"),
        sentence = sentence,
        segments = segments,
        detail = root.optString("detail", ""),
    )
}

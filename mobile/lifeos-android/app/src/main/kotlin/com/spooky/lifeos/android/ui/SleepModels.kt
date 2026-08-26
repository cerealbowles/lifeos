package com.spooky.lifeos.android.ui

import org.json.JSONObject

data class SleepSession(val id: String, val startedAt: String, val endedAt: String?, val durationSeconds: Int?)

data class SleepStageSegment(val stage: String, val startedAt: String, val endedAt: String)

data class SkinTempBaseline(
    val latestValue: Double?,
    val latestUnit: String?,
    val latestMeasuredAt: String?,
    val baseline: Double?,
    val baselineSampleCount: Int,
    val deviation: Double?,
    val status: String?, // "very_low" | "low" | "normal" | "elevated" | "high" | null
)

data class TrendPoint(val value: Double, val measuredAt: String)

fun parseSleepSessions(jsonText: String): List<SleepSession> {
    val arr = JSONObject(jsonText).optJSONArray("sessions") ?: return emptyList()
    return (0 until arr.length()).map { i ->
        val o = arr.getJSONObject(i)
        SleepSession(
            id = o.getString("id"),
            startedAt = o.getString("startedAt"),
            endedAt = o.optString("endedAt").takeIf { o.has("endedAt") && !o.isNull("endedAt") },
            durationSeconds = if (o.has("durationSeconds") && !o.isNull("durationSeconds")) o.getInt("durationSeconds") else null,
        )
    }
}

fun parseSleepSessionDetail(jsonText: String): List<SleepStageSegment> {
    val arr = JSONObject(jsonText).optJSONArray("segments") ?: return emptyList()
    return (0 until arr.length()).map { i ->
        val o = arr.getJSONObject(i)
        SleepStageSegment(stage = o.getString("stage"), startedAt = o.getString("startedAt"), endedAt = o.getString("endedAt"))
    }
}

fun parseSkinTempBaseline(jsonText: String): SkinTempBaseline {
    val root = JSONObject(jsonText)
    val latest = root.optJSONObject("latest")
    return SkinTempBaseline(
        latestValue = latest?.optDouble("value"),
        latestUnit = latest?.optString("unit"),
        latestMeasuredAt = latest?.optString("measuredAt"),
        baseline = root.optDouble("baseline").takeIf { root.has("baseline") && !root.isNull("baseline") },
        baselineSampleCount = root.optInt("baselineSampleCount", 0),
        deviation = root.optDouble("deviation").takeIf { root.has("deviation") && !root.isNull("deviation") },
        status = root.optString("status").takeIf { root.has("status") && !root.isNull("status") },
    )
}

fun parseTrendPoints(jsonText: String): List<TrendPoint> {
    val arr = JSONObject(jsonText).optJSONArray("measurements") ?: return emptyList()
    return (0 until arr.length()).map { i ->
        val o = arr.getJSONObject(i)
        TrendPoint(value = o.getString("value").toDouble(), measuredAt = o.getString("measuredAt"))
    }
}

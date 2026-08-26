package com.spooky.lifeos.android.ui

import org.json.JSONObject

data class WhoopReading(val type: String, val value: String, val unit: String, val measuredAt: String)

/** Mirrors components/health/whoop-card.tsx's LABELS map exactly. */
val WHOOP_LABELS: Map<String, String> = mapOf(
    "recovery_score" to "Recovery",
    "strain" to "Strain",
    "hrv" to "HRV",
    "heart_rate" to "Heart rate",
    "spo2" to "SpO2",
    "skin_temp" to "Skin temp",
    "sleep_performance" to "Sleep",
)

/** Mirrors whoop-card.tsx's DISPLAY_ORDER — fixed order regardless of which types have data. */
val WHOOP_DISPLAY_ORDER = listOf("recovery_score", "strain", "sleep_performance", "hrv", "heart_rate", "spo2", "skin_temp")

/**
 * Same defensive rounding as whoop-card.tsx's formatValue — `measurements.value` is Postgres
 * `numeric`, returned as a string preserving whatever precision was written. Kept even though
 * the companion app now rounds at the source (mobile/whoop-bridge's Derive.kt), same "fix
 * already-stored bad values too" reasoning as the web card.
 */
fun formatWhoopValue(raw: String): String {
    val n = raw.toDoubleOrNull() ?: return raw
    return formatWhoopValue(n)
}

/** Double overload — same rounding/trailing-zero-stripping, for AnimatedNumber's format callback. */
fun formatWhoopValue(n: Double): String {
    val rounded = kotlin.math.round(n * 10) / 10
    return if (rounded == rounded.toLong().toDouble()) rounded.toLong().toString() else rounded.toString()
}

/** Parses GET /api/whoop/readings's `{ readings: { [type]: { value, unit, measuredAt } } }`. */
fun parseWhoopReadings(jsonText: String): Map<String, WhoopReading> {
    val readingsObj = JSONObject(jsonText).optJSONObject("readings") ?: return emptyMap()
    val out = mutableMapOf<String, WhoopReading>()
    readingsObj.keys().forEach { type ->
        val o = readingsObj.getJSONObject(type)
        out[type] = WhoopReading(
            type = type,
            value = o.getString("value"),
            unit = o.getString("unit"),
            measuredAt = o.getString("measuredAt"),
        )
    }
    return out
}

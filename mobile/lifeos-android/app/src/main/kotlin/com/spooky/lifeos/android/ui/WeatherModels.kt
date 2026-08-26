package com.spooky.lifeos.android.ui

import org.json.JSONObject

/** Mirrors lib/weather/service.ts's WeatherView exactly — same fields, same names. */
data class WeatherView(
    val locationName: String,
    val temperature: Int,
    val feelsLike: Int,
    val conditions: String,
    val highToday: Int,
    val lowToday: Int,
    val precipitationChance: Int,
    val precipitationAmount: Double,
    val unit: String, // "F" | "C"
)

/** Parses GET /api/weather's `{ weather: WeatherView | null }` — null means not connected. */
fun parseWeather(jsonText: String): WeatherView? {
    val root = JSONObject(jsonText)
    if (root.isNull("weather") || !root.has("weather")) return null
    val o = root.optJSONObject("weather") ?: return null
    return WeatherView(
        locationName = o.getString("locationName"),
        temperature = o.getInt("temperature"),
        feelsLike = o.getInt("feelsLike"),
        conditions = o.getString("conditions"),
        highToday = o.getInt("highToday"),
        lowToday = o.getInt("lowToday"),
        precipitationChance = o.getInt("precipitationChance"),
        precipitationAmount = o.optDouble("precipitationAmount", 0.0),
        unit = o.getString("unit"),
    )
}

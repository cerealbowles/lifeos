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

private fun parseWeatherView(o: JSONObject): WeatherView = WeatherView(
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

/** Parses GET /api/weather's `{ weather: WeatherView | null }` — null means not connected. */
fun parseWeather(jsonText: String): WeatherView? {
    val root = JSONObject(jsonText)
    if (root.isNull("weather") || !root.has("weather")) return null
    val o = root.optJSONObject("weather") ?: return null
    return parseWeatherView(o)
}

/** Mirrors lib/weather/service.ts's HourlyView/DailyView/WeatherOverview exactly. */
data class HourlyForecast(val time: String, val temperature: Int, val conditions: String, val precipitationChance: Int)

data class DailyForecast(
    val date: String,
    val high: Int,
    val low: Int,
    val conditions: String,
    val precipitationChance: Int,
    val precipitationAmount: Double,
)

data class WeatherOverview(val current: WeatherView, val hourly: List<HourlyForecast>, val daily: List<DailyForecast>)

/** Parses GET /api/weather?scope=forecast's `{ weather: WeatherOverview | null }`. */
fun parseWeatherOverview(jsonText: String): WeatherOverview? {
    val root = JSONObject(jsonText)
    if (root.isNull("weather") || !root.has("weather")) return null
    val o = root.optJSONObject("weather") ?: return null
    val current = o.optJSONObject("current")?.let { parseWeatherView(it) } ?: return null
    val hourly = o.optJSONArray("hourly")?.let { arr ->
        (0 until arr.length()).map { i ->
            val h = arr.getJSONObject(i)
            HourlyForecast(
                time = h.getString("time"),
                temperature = h.getInt("temperature"),
                conditions = h.getString("conditions"),
                precipitationChance = h.getInt("precipitationChance"),
            )
        }
    } ?: emptyList()
    val daily = o.optJSONArray("daily")?.let { arr ->
        (0 until arr.length()).map { i ->
            val d = arr.getJSONObject(i)
            DailyForecast(
                date = d.getString("date"),
                high = d.getInt("high"),
                low = d.getInt("low"),
                conditions = d.getString("conditions"),
                precipitationChance = d.getInt("precipitationChance"),
                precipitationAmount = d.optDouble("precipitationAmount", 0.0),
            )
        }
    } ?: emptyList()
    return WeatherOverview(current, hourly, daily)
}

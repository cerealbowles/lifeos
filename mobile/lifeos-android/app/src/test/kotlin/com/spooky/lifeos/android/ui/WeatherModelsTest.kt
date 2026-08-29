package com.spooky.lifeos.android.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class WeatherModelsTest {
    private val currentJson = """
        {
          "locationName": "Home",
          "temperature": 68,
          "feelsLike": 66,
          "conditions": "Clear",
          "highToday": 92,
          "lowToday": 60,
          "precipitationChance": 10,
          "precipitationAmount": 0.0,
          "unit": "F"
        }
    """.trimIndent()

    @Test
    fun `parseWeather returns null when not connected`() {
        assertNull(parseWeather("""{ "weather": null }"""))
    }

    @Test
    fun `parseWeather parses a connected payload`() {
        val result = parseWeather("""{ "weather": $currentJson }""")

        assertEquals(68, result?.temperature)
        assertEquals("Clear", result?.conditions)
        assertEquals("F", result?.unit)
    }

    @Test
    fun `parseWeatherOverview returns null when not connected`() {
        assertNull(parseWeatherOverview("""{ "weather": null }"""))
    }

    @Test
    fun `parseWeatherOverview parses current, hourly, and daily`() {
        val json = """
            {
              "weather": {
                "current": $currentJson,
                "hourly": [
                  { "time": "2026-08-29T10:00:00Z", "temperature": 70, "conditions": "Clouds", "precipitationChance": 55 }
                ],
                "daily": [
                  { "date": "2026-08-29", "high": 92, "low": 60, "conditions": "Clear", "precipitationChance": 10, "precipitationAmount": 0.0 }
                ]
              }
            }
        """.trimIndent()

        val result = parseWeatherOverview(json)

        assertEquals(68, result?.current?.temperature)
        assertEquals(1, result?.hourly?.size)
        assertEquals(55, result?.hourly?.get(0)?.precipitationChance)
        assertEquals(1, result?.daily?.size)
        assertEquals(92, result?.daily?.get(0)?.high)
    }
}

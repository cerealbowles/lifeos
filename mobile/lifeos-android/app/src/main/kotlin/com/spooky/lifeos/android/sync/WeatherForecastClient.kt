package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.WeatherOverview
import com.spooky.lifeos.android.ui.parseWeatherOverview
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** GET /api/weather?scope=forecast — best-effort, self-suppressing (null on failure or not-connected). */
class WeatherForecastClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetch(): WeatherOverview? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/weather?scope=forecast")
                .header("Authorization", "Bearer $token")
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) null else parseWeatherOverview(body)
            }
        } catch (e: Exception) {
            null
        }
    }
}

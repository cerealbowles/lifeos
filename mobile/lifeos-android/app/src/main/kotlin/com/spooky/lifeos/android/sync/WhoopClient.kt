package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.WhoopReading
import com.spooky.lifeos.android.ui.parseWhoopReadings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** GET /api/whoop/readings — latest-per-type readings synced by the whoop-bridge companion app. */
class WhoopClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetch(): ApiResult<Map<String, WhoopReading>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$baseUrl/api/whoop/readings").header("Authorization", "Bearer $token").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure("HTTP ${response.code}")
                ApiResult.Success(parseWhoopReadings(body))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

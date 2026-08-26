package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.TrendPoint
import com.spooky.lifeos.android.ui.parseTrendPoints
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** GET /api/measurements?type=X&range=Y — same endpoint the web trend charts use. */
class MeasurementsClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun trend(type: String, range: String = "30d"): ApiResult<List<TrendPoint>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/measurements?type=$type&range=$range")
                .header("Authorization", "Bearer $token")
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure("HTTP ${response.code}")
                ApiResult.Success(parseTrendPoints(body))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

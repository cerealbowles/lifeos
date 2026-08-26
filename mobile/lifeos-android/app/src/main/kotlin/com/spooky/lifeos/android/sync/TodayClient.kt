package com.spooky.lifeos.android.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

sealed class TodayFetchResult {
    data class Success(val jsonText: String) : TodayFetchResult()
    data class Failure(val message: String) : TodayFetchResult()
}

/**
 * GET /api/today with the device's Bearer token (lib/auth/api-token.ts on the server side).
 * Returns the raw JSON text — see TodayCache's doc comment for why this stays unparsed at
 * the storage layer (the server's ranking is already final; this app never needs to
 * recompute it, only display it).
 */
class TodayClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetchToday(): TodayFetchResult = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/api/today")
            .header("Authorization", "Bearer $token")
            .build()
        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) {
                    TodayFetchResult.Failure("HTTP ${response.code}")
                } else {
                    TodayFetchResult.Success(body)
                }
            }
        } catch (e: Exception) {
            TodayFetchResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

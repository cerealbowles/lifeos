package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.Boxscore
import com.spooky.lifeos.android.ui.parseBoxscore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

sealed class BoxscoreFetchResult {
    data class Success(val boxscore: Boxscore) : BoxscoreFetchResult()
    data class Failure(val message: String) : BoxscoreFetchResult()
}

/**
 * GET /api/sports/games/mlb/{gamePk}/boxscore — on-demand only (called when the Home detail
 * sheet shows a live/final MLB game), mirroring components/sports/boxscore-panel.tsx's fetch.
 */
class BoxscoreClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetchBoxscore(gamePk: Int): BoxscoreFetchResult = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/api/sports/games/mlb/$gamePk/boxscore")
            .header("Authorization", "Bearer $token")
            .build()
        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) {
                    val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
                    BoxscoreFetchResult.Failure(serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP ${response.code}")
                } else {
                    BoxscoreFetchResult.Success(parseBoxscore(body))
                }
            }
        } catch (e: Exception) {
            BoxscoreFetchResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

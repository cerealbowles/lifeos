package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.SkinTempBaseline
import com.spooky.lifeos.android.ui.SleepSession
import com.spooky.lifeos.android.ui.SleepStageSegment
import com.spooky.lifeos.android.ui.parseSkinTempBaseline
import com.spooky.lifeos.android.ui.parseSleepSessionDetail
import com.spooky.lifeos.android.ui.parseSleepSessions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** GET /api/sleep/sessions[, /[id]] and GET /api/whoop/skin-temp-baseline. */
class SleepClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    private suspend fun get(path: String): ApiResult<String> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$baseUrl$path").header("Authorization", "Bearer $token").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) ApiResult.Failure("HTTP ${response.code}") else ApiResult.Success(body)
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun listSessions(range: String = "30d"): ApiResult<List<SleepSession>> =
        when (val result = get("/api/sleep/sessions?range=$range")) {
            is ApiResult.Success -> ApiResult.Success(parseSleepSessions(result.value))
            is ApiResult.Failure -> result
        }

    suspend fun sessionSegments(sessionId: String): ApiResult<List<SleepStageSegment>> =
        when (val result = get("/api/sleep/sessions/$sessionId")) {
            is ApiResult.Success -> ApiResult.Success(parseSleepSessionDetail(result.value))
            is ApiResult.Failure -> result
        }

    suspend fun skinTempBaseline(): ApiResult<SkinTempBaseline> =
        when (val result = get("/api/whoop/skin-temp-baseline")) {
            is ApiResult.Success -> ApiResult.Success(parseSkinTempBaseline(result.value))
            is ApiResult.Failure -> result
        }
}

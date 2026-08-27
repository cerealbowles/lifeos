package com.spooky.lifeos.android.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * POST /api/workouts — mirrors TasksClient's shape (OkHttp, bearer token, raw JSON parsing).
 * The server model is `date` + a single optional `time` (time-of-day) + `durationMinutes`, not
 * a start/end pair — the "from X pm to Y pm" phone form collects both times but only sends the
 * start time plus the computed duration, same as the web app's own quick-log form.
 */
class WorkoutsClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    suspend fun createWorkout(
        type: String,
        durationMinutes: Int,
        date: String?,
        time: String?,
        outdoor: Boolean,
        note: String?,
    ): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("type", type)
            put("durationMinutes", durationMinutes)
            date?.let { put("date", it) }
            time?.let { put("time", it) }
            put("outdoor", outdoor)
            note?.let { put("note", it) }
        }
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/workouts")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody(jsonMedia))
                .build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private fun errorMessage(code: Int, body: String?): String {
        val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
        return serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP $code"
    }
}

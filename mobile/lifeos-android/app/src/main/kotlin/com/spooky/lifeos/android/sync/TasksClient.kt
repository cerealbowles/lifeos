package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.db.LocalTask
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

sealed class ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>()
    /** `notFound = true` on a 404 — callers treat that as "already gone," not a real failure,
     *  since a task deleted from another device shouldn't jam the outbox retrying forever. */
    data class Failure(val message: String, val notFound: Boolean = false) : ApiResult<Nothing>()
}

/**
 * GET/POST/PATCH/DELETE against /api/tasks — the write-side counterpart to TodayClient. Mirrors
 * its style (OkHttp, bearer token, raw JSON parsing with org.json) rather than introducing a
 * second HTTP convention for one more domain.
 */
class TasksClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    private fun authedRequest(path: String) = Request.Builder()
        .url("$baseUrl$path")
        .header("Authorization", "Bearer $token")

    suspend fun listTasks(): ApiResult<List<LocalTask>> = withContext(Dispatchers.IO) {
        try {
            client.newCall(authedRequest("/api/tasks").build()).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure("HTTP ${response.code}")
                val arr = JSONObject(body).getJSONArray("tasks")
                ApiResult.Success((0 until arr.length()).map { parseTask(arr.getJSONObject(it)) })
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    /** POST /api/tasks — returns the server-assigned task (real id) on success. */
    suspend fun createTask(title: String, description: String?, dueAtMs: Long?, priority: String?, category: String?): ApiResult<LocalTask> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                put("title", title)
                description?.let { put("description", it) }
                dueAtMs?.let { put("dueAt", isoFromMs(it)) }
                priority?.let { put("priority", it) }
                category?.let { put("category", it) }
            }
            try {
                val request = authedRequest("/api/tasks").post(payload.toString().toRequestBody(jsonMedia)).build()
                client.newCall(request).execute().use { response ->
                    val body = response.body?.string()
                    if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                    ApiResult.Success(parseTask(JSONObject(body).getJSONObject("task")))
                }
            } catch (e: Exception) {
                ApiResult.Failure("${e::class.simpleName}: ${e.message}")
            }
        }

    suspend fun completeTask(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("status", "done").toString()
        try {
            val request = authedRequest("/api/tasks/$id").patch(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun deleteTask(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/tasks/$id").delete().build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private fun resultFor(response: okhttp3.Response): ApiResult<Unit> = when {
        response.isSuccessful -> ApiResult.Success(Unit)
        response.code == 404 -> ApiResult.Failure("Not found", notFound = true)
        else -> ApiResult.Failure("HTTP ${response.code}")
    }

    private fun errorMessage(code: Int, body: String?): String {
        val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
        return serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP $code"
    }

    private fun parseTask(o: JSONObject): LocalTask = LocalTask(
        id = o.getString("id"),
        title = o.getString("title"),
        description = o.optString("description").takeIf { o.has("description") && !o.isNull("description") },
        dueAtMs = o.optString("dueAt").takeIf { o.has("dueAt") && !o.isNull("dueAt") }?.let { msFromIso(it) },
        priority = o.optString("priority").takeIf { o.has("priority") && !o.isNull("priority") },
        category = o.optString("category").takeIf { o.has("category") && !o.isNull("category") },
        status = o.getString("status"),
        synced = true,
    )

    private fun isoFromMs(ms: Long): String = java.time.Instant.ofEpochMilli(ms).toString()
    private fun msFromIso(iso: String): Long = java.time.Instant.parse(iso).toEpochMilli()
}

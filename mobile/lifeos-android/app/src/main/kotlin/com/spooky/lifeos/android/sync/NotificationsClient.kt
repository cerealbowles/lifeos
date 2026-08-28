package com.spooky.lifeos.android.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** GET /api/notifications row shape (lib/db/schema/notifications.ts). */
data class NotificationRow(val id: String, val title: String, val body: String?, val createdAt: String, val read: Boolean)

/**
 * In-app notification list (app/api/notifications) — read/mark-read only, no delete (a
 * notification's job is done once seen; nothing in the web UI deletes them either). Web Push
 * subscription management (app/api/notifications/subscribe, vapid-public-key) is deliberately
 * not ported — that's browser Service-Worker push, a different mechanism from Android's own
 * (FCM), out of scope for this pass.
 */
class NotificationsClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    private fun authedRequest(path: String) = Request.Builder().url("$baseUrl$path").header("Authorization", "Bearer $token")

    private fun errorMessage(code: Int, body: String?): String {
        val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
        return serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP $code"
    }

    suspend fun list(): ApiResult<Pair<List<NotificationRow>, Int>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/notifications").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val root = JSONObject(body)
                val arr = root.getJSONArray("notifications")
                val rows = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    NotificationRow(
                        o.getString("id"),
                        o.getString("title"),
                        o.optString("body").takeIf { it.isNotBlank() && !o.isNull("body") },
                        o.getString("createdAt"),
                        o.has("readAt") && !o.isNull("readAt"),
                    )
                }
                ApiResult.Success(rows to root.optInt("unreadCount", 0))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun markRead(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/notifications/$id").patch("".toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun markAllRead(): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/notifications/read-all").post("".toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

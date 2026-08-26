package com.spooky.lifeos.android.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class DeviceInfo(val id: String, val deviceLabel: String, val createdAt: String, val lastUsedAt: String?, val isCurrent: Boolean)

/** GET/DELETE against /api/auth/tokens — the native Settings screen's device list + revoke. */
class SettingsClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun listDevices(): ApiResult<List<DeviceInfo>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$baseUrl/api/auth/tokens").header("Authorization", "Bearer $token").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure("HTTP ${response.code}")
                val arr = JSONObject(body).getJSONArray("tokens")
                ApiResult.Success(
                    (0 until arr.length()).map { i ->
                        val o = arr.getJSONObject(i)
                        DeviceInfo(
                            id = o.getString("id"),
                            deviceLabel = o.getString("deviceLabel"),
                            createdAt = o.getString("createdAt"),
                            lastUsedAt = o.optString("lastUsedAt").takeIf { o.has("lastUsedAt") && !o.isNull("lastUsedAt") },
                            isCurrent = o.optBoolean("isCurrent", false),
                        )
                    },
                )
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun revoke(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$baseUrl/api/auth/tokens/$id").header("Authorization", "Bearer $token").delete().build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) ApiResult.Success(Unit) else ApiResult.Failure("HTTP ${response.code}")
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

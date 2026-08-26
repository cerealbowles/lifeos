package com.spooky.lifeos.whoopbridge.sync

import com.spooky.lifeos.whoopbridge.LifeosConfig
import com.spooky.lifeos.whoopbridge.db.LocalDb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Drains local_db's pending_uploads queue to LifeOS. A batch stays queued — never
 * dropped — until a POST actually returns 2xx, since LifeOS is only reachable over
 * Tailscale and the phone won't always have a route to it. Same behavior as the
 * (now-deleted) Flutter build's uploader.dart.
 */
class Uploader(private val config: LifeosConfig, private val db: LocalDb, private val onLog: (String) -> Unit = {}) {
    private val client = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    suspend fun drainPendingUploads(): Int = withContext(Dispatchers.IO) {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) {
            onLog("Upload skipped: LifeOS URL or token not configured.")
            return@withContext 0
        }

        val pending = db.pendingUploads()
        if (pending.isEmpty()) return@withContext 0
        onLog("Uploading to $baseUrl/api/whoop/readings (${pending.size} batch(es) queued)…")

        var uploaded = 0
        for (item in pending) {
            val request = Request.Builder()
                .url("$baseUrl/api/whoop/readings")
                .header("Authorization", "Bearer $token")
                .post(item.payloadJson.toRequestBody("application/json".toMediaType()))
                .build()
            try {
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        db.deleteUpload(item.id)
                        uploaded++
                    } else {
                        // Non-2xx (e.g. 401 from a stale token) leaves the row queued —
                        // same reasoning as a network failure, both need a human fix.
                        val body = response.body?.string()?.take(300)
                        onLog("Upload failed: HTTP ${response.code} — $body")
                    }
                }
            } catch (e: Exception) {
                onLog("Upload failed: ${e::class.simpleName}: ${e.message}")
            }
        }
        uploaded
    }
}

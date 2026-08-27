package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.db.WhoopLocalDb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Drains WhoopLocalDb's pending_uploads queue to LifeOS's own POST /api/whoop/readings. A
 * batch stays queued — never dropped — until a POST actually returns 2xx, since a Tailscale
 * route isn't always up. Ported in from mobile/whoop-bridge (now retired) verbatim, except
 * the bearer token: it's this device's own per-user API token (LifeosConfig.getToken(),
 * the same one every other Xxx­Client in this package already uses) rather than a separate
 * shared webhook secret — see the server-side route's requireUserOrApiToken.
 */
class WhoopUploader(private val config: LifeosConfig, private val db: WhoopLocalDb, private val onLog: (String) -> Unit = {}) {
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

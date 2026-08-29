package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.DailyRundown
import com.spooky.lifeos.android.ui.parseDailyRundown
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** GET /api/rundown — best-effort, self-suppressing (null on failure). Not cached: the
 *  rundown's tone is live/time-sensitive, so a stale cached copy would actively mislead. */
class DailyRundownClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetch(): DailyRundown? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$baseUrl/api/rundown").header("Authorization", "Bearer $token").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) null else parseDailyRundown(body)
            }
        } catch (e: Exception) {
            null
        }
    }
}

package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.TodayItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

private data class CompletionRequest(val method: String, val path: String, val body: String?)

/**
 * Port of components/dashboard/now-list.tsx's getCompleteRequest — kept as a direct 1:1 mapping
 * (same domains, same URLs, same excluded cases) rather than re-deriving "what's completable"
 * independently, since that function's exclusions are themselves product decisions (ADR-100):
 * financial has no mark-paid action, calendar/sports aren't completable, and a pet "birthday" is
 * a computed occurrence with no underlying row to complete.
 */
private fun completionRequestFor(item: TodayItem): CompletionRequest? = when (item.domain) {
    "task" -> CompletionRequest("PATCH", "/api/tasks/${item.id}", """{"status":"done"}""")
    "routine" -> CompletionRequest("POST", "/api/routines/${item.id}/complete", null)
    "pet" -> if (item.eventType == "birthday") null else CompletionRequest("PATCH", "/api/pets/_/events/${item.id}", """{"completed":true}""")
    "grow" -> CompletionRequest("POST", "/api/grow/${item.id}/check-in", "{}")
    "financial", "calendar", "sports" -> null
    else -> null
}

fun isCompletable(item: TodayItem): Boolean = completionRequestFor(item) != null

/** Executes a NOW item's one-tap "complete" action — see completionRequestFor's doc comment. */
class TodayActionsClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    suspend fun complete(item: TodayItem): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val req = completionRequestFor(item) ?: return@withContext ApiResult.Success(Unit)
        try {
            val builder = Request.Builder().url("$baseUrl${req.path}").header("Authorization", "Bearer $token")
            when (req.method) {
                "PATCH" -> builder.patch((req.body ?: "").toRequestBody(jsonMedia))
                "POST" -> builder.post((req.body ?: "").toRequestBody(jsonMedia))
            }
            client.newCall(builder.build()).execute().use { response ->
                if (response.isSuccessful) ApiResult.Success(Unit) else ApiResult.Failure("HTTP ${response.code}")
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    /**
     * The Home detail sheet's "real" check-in (ItemDetailSheet.kt's GrowCheckInForm) — same
     * endpoint `complete()` already hits with an empty body for swipe-to-complete, but with the
     * fields the sheet actually collects. All three stay optional/omittable (matching the
     * server's checkInSchema — app/api/grow/[id]/check-in/route.ts) so a field the user didn't
     * touch in the sheet is left alone server-side rather than overwritten with an empty value.
     */
    suspend fun checkInPlant(id: String, stage: String?, trichomeStatus: String?, notes: String?): ApiResult<Unit> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                stage?.let { put("stage", it) }
                trichomeStatus?.let { put("trichomeStatus", it) }
                notes?.let { put("notes", it) }
            }
            try {
                val request = Request.Builder()
                    .url("$baseUrl/api/grow/$id/check-in")
                    .header("Authorization", "Bearer $token")
                    .post(payload.toString().toRequestBody(jsonMedia))
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) ApiResult.Success(Unit) else ApiResult.Failure("HTTP ${response.code}")
                }
            } catch (e: Exception) {
                ApiResult.Failure("${e::class.simpleName}: ${e.message}")
            }
        }
}

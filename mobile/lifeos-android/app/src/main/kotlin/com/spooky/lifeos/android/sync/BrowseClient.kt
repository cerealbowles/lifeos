package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.BrowseDomain
import com.spooky.lifeos.android.ui.BrowseRow
import com.spooky.lifeos.android.ui.parseBrowseRows
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * GET for each of the six Browse domains, plus the one write action each domain's detail screen
 * supports (see BrowseDetailScreens.kt). Deliberately not cached to local SQLite like Today/
 * Tasks — Browse is a "go deeper" view reached from the bottom nav, used online (same assumption
 * the web app makes about its own per-domain pages), not part of the offline-reliability scope —
 * so writes here are fire-and-report, not queued through TasksRepository's outbox.
 */
class BrowseClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    private fun authedRequest(path: String) = Request.Builder()
        .url("$baseUrl$path")
        .header("Authorization", "Bearer $token")

    suspend fun list(domain: BrowseDomain): ApiResult<List<BrowseRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(domain.path).build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure("HTTP ${response.code}")
                ApiResult.Success(parseBrowseRows(domain, body))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    /** Retire/restore — same PATCH endpoint toggles both directions (app/api/pets/[id]/route.ts). */
    suspend fun updatePetActive(id: String, active: Boolean): ApiResult<Unit> = patchActive("/api/pets/$id", active)

    /** Harvest/restore — same shape as pets (DECISIONS.md ADR-082, app/api/grow/[id]/route.ts). */
    suspend fun updatePlantActive(id: String, active: Boolean): ApiResult<Unit> = patchActive("/api/grow/$id", active)

    suspend fun completeRoutine(id: String): ApiResult<Unit> = postNoBody("/api/routines/$id/complete")

    suspend fun skipRoutine(id: String): ApiResult<Unit> = postNoBody("/api/routines/$id/skip")

    suspend fun deleteReminder(id: String): ApiResult<Unit> = delete("/api/finance/reminders/$id")

    suspend fun deleteCalendarEvent(id: String): ApiResult<Unit> = delete("/api/calendar/events/$id")

    // --- Create (direct user request, 2026-08-26: "I need functionality" beyond browsing) ---
    // One method per writable domain, mirroring TasksClient.createTask's exact shape (JSON
    // payload builder skipping null optionals, POST, parse the row back out of the response).

    suspend fun createPet(name: String, species: String, breed: String?, birthDate: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.PET, "pet", JSONObject().apply {
            put("name", name)
            put("species", species)
            breed?.let { put("breed", it) }
            birthDate?.let { put("birthDate", it) }
        })

    suspend fun createPlant(strain: String, datePlanted: String, stage: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.GROW, "plant", JSONObject().apply {
            put("strain", strain)
            put("datePlanted", datePlanted)
            stage?.let { put("stage", it) }
        })

    suspend fun createReminder(name: String, amount: String?, dueDay: Int, autopay: Boolean?, notes: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.FINANCIAL, "reminder", JSONObject().apply {
            put("name", name)
            amount?.let { put("amount", it) }
            put("dueDay", dueDay)
            autopay?.let { put("autopay", it) }
            notes?.let { put("notes", it) }
        })

    suspend fun createRoutine(name: String, description: String?, category: String?, recurrenceType: String, recurrenceConfig: JSONObject): ApiResult<BrowseRow> =
        create(BrowseDomain.ROUTINE, "routine", JSONObject().apply {
            put("name", name)
            description?.let { put("description", it) }
            category?.let { put("category", it) }
            put("recurrenceType", recurrenceType)
            put("recurrenceConfig", recurrenceConfig)
        })

    suspend fun createEvent(title: String, startAtIso: String, endAtIso: String?, allDay: Boolean?, location: String?, description: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.CALENDAR, "event", JSONObject().apply {
            put("title", title)
            put("startAt", startAtIso)
            endAtIso?.let { put("endAt", it) }
            allDay?.let { put("allDay", it) }
            location?.let { put("location", it) }
            description?.let { put("description", it) }
        })

    // --- Update (full multi-field PATCH, additive alongside the existing single-field
    // patchActive/completeRoutine/skipRoutine which the detail screens' non-edit actions still
    // use unchanged) ---

    suspend fun updatePet(id: String, name: String?, species: String?, breed: String?, birthDate: String?): ApiResult<Unit> =
        update("/api/pets/$id", JSONObject().apply {
            name?.let { put("name", it) }
            species?.let { put("species", it) }
            breed?.let { put("breed", it) }
            birthDate?.let { put("birthDate", it) }
        })

    suspend fun updatePlant(id: String, strain: String?, stage: String?, trichomeStatus: String?, notes: String?): ApiResult<Unit> =
        update("/api/grow/$id", JSONObject().apply {
            strain?.let { put("strain", it) }
            stage?.let { put("stage", it) }
            trichomeStatus?.let { put("trichomeStatus", it) }
            notes?.let { put("notes", it) }
        })

    suspend fun updateReminder(id: String, name: String?, amount: String?, dueDay: Int?, autopay: Boolean?, notes: String?): ApiResult<Unit> =
        update("/api/finance/reminders/$id", JSONObject().apply {
            name?.let { put("name", it) }
            amount?.let { put("amount", it) }
            dueDay?.let { put("dueDay", it) }
            autopay?.let { put("autopay", it) }
            notes?.let { put("notes", it) }
        })

    suspend fun updateRoutine(id: String, name: String?, description: String?, category: String?, recurrenceType: String?, recurrenceConfig: JSONObject?): ApiResult<Unit> =
        update("/api/routines/$id", JSONObject().apply {
            name?.let { put("name", it) }
            description?.let { put("description", it) }
            category?.let { put("category", it) }
            recurrenceType?.let { put("recurrenceType", it) }
            recurrenceConfig?.let { put("recurrenceConfig", it) }
        })

    suspend fun updateEvent(id: String, title: String?, startAtIso: String?, endAtIso: String?, allDay: Boolean?, location: String?, description: String?): ApiResult<Unit> =
        update("/api/calendar/events/$id", JSONObject().apply {
            title?.let { put("title", it) }
            startAtIso?.let { put("startAt", it) }
            endAtIso?.let { put("endAt", it) }
            allDay?.let { put("allDay", it) }
            location?.let { put("location", it) }
            description?.let { put("description", it) }
        })

    private suspend fun create(domain: BrowseDomain, jsonKey: String, payload: JSONObject): ApiResult<BrowseRow> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(domain.path).post(payload.toString().toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val row = JSONObject(body).getJSONObject(jsonKey)
                ApiResult.Success(parseBrowseRows(domain, JSONObject().put(domain.jsonKey, org.json.JSONArray().put(row)).toString()).first())
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private suspend fun update(path: String, payload: JSONObject): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(path).patch(payload.toString().toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    /** Prefers the server's own `{error: "..."}` message (e.g. a zod validation message) over a
     *  bare status code — same reasoning as TasksClient's identical helper. */
    private fun errorMessage(code: Int, body: String?): String {
        val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
        return serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP $code"
    }

    private suspend fun patchActive(path: String, active: Boolean): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("active", active).toString()
        try {
            val request = authedRequest(path).patch(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private suspend fun postNoBody(path: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(path).post("".toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private suspend fun delete(path: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(path).delete().build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private fun resultFor(response: Response): ApiResult<Unit> = when {
        response.isSuccessful -> ApiResult.Success(Unit)
        response.code == 404 -> ApiResult.Failure("Not found", notFound = true)
        else -> ApiResult.Failure("HTTP ${response.code}")
    }
}

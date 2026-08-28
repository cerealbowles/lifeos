package com.spooky.lifeos.android.sync

import com.spooky.lifeos.android.ui.BrowseDomain
import com.spooky.lifeos.android.ui.BrowseRow
import com.spooky.lifeos.android.ui.parseBrowseRows
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** GET /api/sports/teams row shape (lib/db/schema/sports.ts's favoriteTeams table). */
data class FavoriteTeamRow(val id: String, val sport: String, val teamAbbr: String, val teamName: String)

/** GET /api/lists/[id]/items row shape (lib/db/schema/lists.ts's listItems table). */
data class ListItemRow(val id: String, val name: String, val quantity: String?, val unit: String?, val checked: Boolean)

/** GET /api/grow/[id]/photos row shape (GrowPlantPhotoDTO). */
data class PlantPhotoRow(val id: String, val caption: String?, val imageUrl: String)

/** GET /api/challenges/[id]'s getChallengeDetail response, trimmed to what the Android detail
 *  screen shows — today's habit checklist, not the full multi-day completion history grid. */
data class ChallengeHabitRow(val id: String, val title: String, val autoCheck: Boolean, val doneToday: Boolean)
data class ChallengeDetail(val name: String, val status: String, val day: Int, val durationDays: Int, val todayDate: String, val habits: List<ChallengeHabitRow>)

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

    suspend fun deletePet(id: String): ApiResult<Unit> = delete("/api/pets/$id")

    suspend fun deletePlant(id: String): ApiResult<Unit> = delete("/api/grow/$id")

    suspend fun deleteRoutine(id: String): ApiResult<Unit> = delete("/api/routines/$id")

    // --- Favorite teams (app/api/sports/teams, lib/sports/service.ts) — a follow/unfollow list,
    // not a sixth Browse domain (games stay read-only, this is closer to a settings sub-screen,
    // mirroring where the web app puts it: components/settings/sports-form.tsx). ---

    suspend fun listFavoriteTeams(): ApiResult<List<FavoriteTeamRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/sports/teams").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val arr = JSONObject(body).getJSONArray("teams")
                val teams = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    FavoriteTeamRow(o.getString("id"), o.getString("sport"), o.getString("teamAbbr"), o.getString("teamName"))
                }
                ApiResult.Success(teams)
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addFavoriteTeam(sport: String, teamAbbr: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("sport", sport).put("teamAbbr", teamAbbr).toString()
        try {
            val request = authedRequest("/api/sports/teams").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun removeFavoriteTeam(id: String): ApiResult<Unit> = delete("/api/sports/teams/$id")

    // --- Lists (app/api/lists, lib/lists/service.ts) — nested items, so unlike every other
    // domain a list's detail screen needs a second network call rather than reading purely
    // from row.raw (the list-endpoint row has no items array). ---

    suspend fun listListItems(listId: String): ApiResult<List<ListItemRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/lists/$listId/items").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val arr = JSONObject(body).getJSONArray("items")
                val items = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    ListItemRow(
                        o.getString("id"),
                        o.getString("name"),
                        o.optString("quantity").takeIf { o.has("quantity") && !o.isNull("quantity") },
                        o.optString("unit").takeIf { o.has("unit") && !o.isNull("unit") },
                        o.optBoolean("checked", false),
                    )
                }
                ApiResult.Success(items)
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addListItem(listId: String, name: String, quantity: String?, unit: String?, notes: String?): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("name", name)
            quantity?.let { put("quantity", it) }
            unit?.let { put("unit", it) }
            notes?.let { put("notes", it) }
        }.toString()
        try {
            val request = authedRequest("/api/lists/$listId/items").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun setListItemChecked(listId: String, itemId: String, checked: Boolean): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("checked", checked).toString()
        try {
            val request = authedRequest("/api/lists/$listId/items/$itemId").patch(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun removeListItem(listId: String, itemId: String): ApiResult<Unit> = delete("/api/lists/$listId/items/$itemId")

    suspend fun createList(name: String, listType: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.LISTS, "list", JSONObject().apply {
            put("name", name)
            listType?.let { put("listType", it) }
        })

    suspend fun renameList(id: String, name: String): ApiResult<Unit> = update("/api/lists/$id", JSONObject().put("name", name))

    /** DELETE archives (lib/lists/service.ts archiveList) — same soft-delete reasoning pets use. */
    suspend fun deleteList(id: String): ApiResult<Unit> = delete("/api/lists/$id")

    // --- Moments (app/api/moments, ADR-096) — multipart, unlike every other create call, since
    // this carries an actual photo file rather than JSON. Requires the user's Immich connection
    // to be set up server-side (Settings → Immich on web) or POST fails with 409. ---

    suspend fun createMoment(bytes: ByteArray, filename: String, mimeType: String, caption: String?, location: String?): ApiResult<Unit> =
        withContext(Dispatchers.IO) {
            val body = MultipartBody.Builder().setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, bytes.toRequestBody(mimeType.toMediaType()))
                .apply {
                    caption?.let { addFormDataPart("caption", it) }
                    location?.let { addFormDataPart("location", it) }
                }
                .build()
            try {
                val request = authedRequest("/api/moments").post(body).build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                    ApiResult.Failure(errorMessage(response.code, response.body?.string()))
                }
            } catch (e: Exception) {
                ApiResult.Failure("${e::class.simpleName}: ${e.message}")
            }
        }

    suspend fun deleteMoment(id: String): ApiResult<Unit> = delete("/api/moments/$id")

    // --- Challenges (app/api/challenges, lib/challenges/service.ts) — like Lists, the list
    // endpoint's bare rows (name/startDate/durationDays/status) don't carry habits, so the
    // detail screen fetches getChallengeDetail separately. Scoped to *today's* checklist only,
    // not the full multi-day completion grid the web /challenges/[id] page renders. ---

    suspend fun createChallenge(name: String, startDate: String, durationDays: Int, habitTitles: List<String>): ApiResult<BrowseRow> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                put("name", name)
                put("startDate", startDate)
                put("durationDays", durationDays)
                put("habitTitles", org.json.JSONArray(habitTitles))
            }
            try {
                val request = authedRequest(BrowseDomain.CHALLENGES.path).post(payload.toString().toRequestBody(jsonMedia)).build()
                client.newCall(request).execute().use { response ->
                    val body = response.body?.string()
                    if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                    val row = JSONObject(body).getJSONObject("challenge")
                    ApiResult.Success(parseBrowseRows(BrowseDomain.CHALLENGES, JSONObject().put("challenges", org.json.JSONArray().put(row)).toString()).first())
                }
            } catch (e: Exception) {
                ApiResult.Failure("${e::class.simpleName}: ${e.message}")
            }
        }

    suspend fun getChallengeDetail(id: String): ApiResult<ChallengeDetail> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/challenges/$id").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val root = JSONObject(body)
                val challenge = root.getJSONObject("challenge")
                val todayDate = root.getString("todayDate")
                val completedSet = root.getJSONArray("completedSet").let { arr -> (0 until arr.length()).map { arr.getString(it) }.toSet() }
                val habitsArr = root.getJSONArray("habits")
                val habits = (0 until habitsArr.length()).map { i ->
                    val h = habitsArr.getJSONObject(i)
                    ChallengeHabitRow(
                        id = h.getString("id"),
                        title = h.getString("title"),
                        autoCheck = h.optBoolean("autoCheck", false),
                        doneToday = "${h.getString("id")}:$todayDate" in completedSet,
                    )
                }
                ApiResult.Success(
                    ChallengeDetail(
                        name = challenge.getString("name"),
                        status = challenge.getString("status"),
                        day = root.optInt("day", 1),
                        durationDays = challenge.getInt("durationDays"),
                        todayDate = todayDate,
                        habits = habits,
                    ),
                )
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun toggleHabitToday(challengeId: String, habitId: String, todayDate: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("habitId", habitId).put("date", todayDate).toString()
        try {
            val request = authedRequest("/api/challenges/$challengeId/completions").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addChallengeHabit(challengeId: String, title: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("title", title).toString()
        try {
            val request = authedRequest("/api/challenges/$challengeId/habits").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response -> resultFor(response) }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun removeChallengeHabit(challengeId: String, habitId: String): ApiResult<Unit> = delete("/api/challenges/$challengeId/habits/$habitId")

    suspend fun updateChallengeStatus(id: String, status: String): ApiResult<Unit> = update("/api/challenges/$id", JSONObject().put("status", status))

    suspend fun deleteChallenge(id: String): ApiResult<Unit> = delete("/api/challenges/$id")

    // --- Finance accounts (app/api/finance/accounts) — separate from "Money" (financial
    // reminders) above; no PATCH endpoint exists server-side, so this domain is create/delete
    // only, no edit mode. ---

    suspend fun createAccount(name: String, accountType: String, institution: String?, lastFour: String?, statementCloseDay: Int?): ApiResult<BrowseRow> =
        create(BrowseDomain.ACCOUNTS, "account", JSONObject().apply {
            put("name", name)
            put("accountType", accountType)
            institution?.let { put("institution", it) }
            lastFour?.let { put("lastFour", it) }
            statementCloseDay?.let { put("statementCloseDay", it) }
        })

    suspend fun deleteAccount(id: String): ApiResult<Unit> = delete("/api/finance/accounts/$id")

    // --- Grow photos (app/api/grow/[id]/photos, ADR-097) — same Immich-backed multipart shape
    // as Moments (createMoment), scoped to one plant's own album. ---

    suspend fun listPlantPhotos(plantId: String): ApiResult<List<PlantPhotoRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/grow/$plantId/photos").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val arr = JSONObject(body).getJSONArray("photos")
                val photos = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    PlantPhotoRow(o.getString("id"), o.optString("caption").takeIf { it.isNotBlank() && !o.isNull("caption") }, o.getString("imageUrl"))
                }
                ApiResult.Success(photos)
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addPlantPhoto(plantId: String, bytes: ByteArray, filename: String, mimeType: String, caption: String?): ApiResult<Unit> =
        withContext(Dispatchers.IO) {
            val body = MultipartBody.Builder().setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, bytes.toRequestBody(mimeType.toMediaType()))
                .apply { caption?.let { addFormDataPart("caption", it) } }
                .build()
            try {
                val request = authedRequest("/api/grow/$plantId/photos").post(body).build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                    ApiResult.Failure(errorMessage(response.code, response.body?.string()))
                }
            } catch (e: Exception) {
                ApiResult.Failure("${e::class.simpleName}: ${e.message}")
            }
        }

    suspend fun deletePlantPhoto(plantId: String, photoId: String): ApiResult<Unit> = delete("/api/grow/$plantId/photos/$photoId")

    // --- Feed subscriptions (app/api/feed/subscriptions) — the RSS reading list's items
    // themselves aren't a browsable domain here (external content, like Sports games), just
    // the subscriptions that decide what feeds into it. ---

    suspend fun createFeedSubscription(feedUrl: String): ApiResult<BrowseRow> =
        create(BrowseDomain.FEED, "subscription", JSONObject().put("feedUrl", feedUrl))

    suspend fun deleteFeedSubscription(id: String): ApiResult<Unit> = delete("/api/feed/subscriptions/$id")

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

    suspend fun createNote(title: String?, body: String?): ApiResult<BrowseRow> =
        create(BrowseDomain.NOTES, "note", JSONObject().apply {
            title?.let { put("title", it) }
            body?.let { put("body", it) }
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

    suspend fun updateNote(id: String, title: String?, body: String?, pinned: Boolean?): ApiResult<Unit> =
        update("/api/notes/$id", JSONObject().apply {
            title?.let { put("title", it) }
            body?.let { put("body", it) }
            pinned?.let { put("pinned", it) }
        })

    suspend fun deleteNote(id: String): ApiResult<Unit> = delete("/api/notes/$id")

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

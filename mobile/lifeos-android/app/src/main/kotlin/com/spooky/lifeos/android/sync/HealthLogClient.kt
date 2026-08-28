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
 * Manual health logging — weight measurements, workouts, and (stretching) activity sessions —
 * added alongside HealthScreen.kt's previously read-only Whoop telemetry view. Direct user
 * request, 2026-08-28: delete needed everywhere, and health logging shouldn't be web-only.
 * Same fire-and-report shape as BrowseClient (no offline outbox), and same authedRequest/
 * errorMessage pattern, but a separate small class rather than folding into BrowseClient since
 * these three domains aren't part of the Browse tab at all — they live on Health.
 */
data class MeasurementRow(val id: String, val value: String, val unit: String, val measuredAt: String)
data class WorkoutRow(val id: String, val date: String, val type: String, val durationMinutes: Int, val outdoor: Boolean, val note: String?)
data class ActivitySessionRow(val id: String, val activityType: String, val startedAt: String, val endedAt: String?, val durationSeconds: Int?)

class HealthLogClient(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonMedia = "application/json".toMediaType()

    private fun authedRequest(path: String) = Request.Builder()
        .url("$baseUrl$path")
        .header("Authorization", "Bearer $token")

    private fun errorMessage(code: Int, body: String?): String {
        val serverMessage = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
        return serverMessage?.takeIf { it.isNotBlank() } ?: "HTTP $code"
    }

    // --- Weight/measurements ---

    suspend fun listMeasurements(type: String = "weight", range: String = "90d"): ApiResult<List<MeasurementRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/measurements?type=$type&range=$range").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val arr = JSONObject(body).getJSONArray("measurements")
                val rows = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    MeasurementRow(o.getString("id"), o.getString("value"), o.getString("unit"), o.getString("measuredAt"))
                }
                ApiResult.Success(rows.sortedByDescending { it.measuredAt })
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addMeasurement(type: String, value: String, unit: String, measuredAtIso: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("type", type).put("value", value).put("unit", unit).put("measuredAt", measuredAtIso).toString()
        try {
            val request = authedRequest("/api/measurements").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun deleteMeasurement(id: String): ApiResult<Unit> = delete("/api/measurements/$id")

    // --- Workouts ---

    suspend fun listWorkouts(): ApiResult<List<WorkoutRow>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/workouts").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val arr = JSONObject(body).getJSONArray("workouts")
                val rows = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    WorkoutRow(
                        o.getString("id"),
                        o.getString("date"),
                        o.getString("type"),
                        o.getInt("durationMinutes"),
                        o.optBoolean("outdoor", false),
                        o.optString("note").takeIf { it.isNotBlank() && !o.isNull("note") },
                    )
                }
                ApiResult.Success(rows.sortedByDescending { it.date })
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun addWorkout(type: String, durationMinutes: Int, outdoor: Boolean, note: String?, date: String?): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("type", type)
            put("durationMinutes", durationMinutes)
            put("outdoor", outdoor)
            note?.let { put("note", it) }
            date?.let { put("date", it) }
        }.toString()
        try {
            val request = authedRequest("/api/workouts").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun deleteWorkout(id: String): ApiResult<Unit> = delete("/api/workouts/$id")

    // --- Activity sessions (currently just "stretching" — ACTIVITY_TYPES) ---

    suspend fun listActivitySessions(): ApiResult<Pair<ActivitySessionRow?, List<ActivitySessionRow>>> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/activities/sessions").build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) return@withContext ApiResult.Failure(errorMessage(response.code, body))
                val root = JSONObject(body)
                val active = root.optJSONObject("activeSession")?.let { parseSession(it) }
                val arr = root.getJSONArray("sessions")
                val sessions = (0 until arr.length()).map { i -> parseSession(arr.getJSONObject(i)) }
                ApiResult.Success(active to sessions)
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    private fun parseSession(o: JSONObject) = ActivitySessionRow(
        o.getString("id"),
        o.getString("activityType"),
        o.getString("startedAt"),
        o.optString("endedAt").takeIf { o.has("endedAt") && !o.isNull("endedAt") },
        o.optInt("durationSeconds", -1).takeIf { o.has("durationSeconds") && !o.isNull("durationSeconds") && it >= 0 },
    )

    suspend fun startActivitySession(activityType: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("activityType", activityType).toString()
        try {
            val request = authedRequest("/api/activities/sessions").post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun completeActivitySession(id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest("/api/activities/sessions/$id").patch("".toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }

    suspend fun deleteActivitySession(id: String): ApiResult<Unit> = delete("/api/activities/sessions/$id")

    private suspend fun delete(path: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = authedRequest(path).delete().build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) return@withContext ApiResult.Success(Unit)
                ApiResult.Failure(errorMessage(response.code, response.body?.string()))
            }
        } catch (e: Exception) {
            ApiResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

package com.spooky.lifeos.android.sync

import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

sealed class LoginResult {
    data class Success(val token: String, val tokenId: String) : LoginResult()
    data class Failure(val message: String) : LoginResult()
}

/**
 * POST /api/auth/mobile-login — see the plan's "auth gap" section: the web app's own login
 * is a Server Action (HTML form + redirect), not something this client can call directly,
 * so this hits the JSON wrapper added specifically for native clients instead.
 */
class AuthClient(private val baseUrl: String) {
    private val client = OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()

    suspend fun login(email: String, password: String): LoginResult = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("email", email)
            .put("password", password)
            .put("deviceLabel", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            .toString()

        val request = Request.Builder()
            .url("$baseUrl/api/auth/mobile-login")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) {
                    val message = body?.let { runCatching { JSONObject(it).optString("error") }.getOrNull() }
                    return@withContext LoginResult.Failure(message?.takeIf { it.isNotBlank() } ?: "Login failed (HTTP ${response.code}).")
                }
                val parsed = JSONObject(body)
                LoginResult.Success(token = parsed.getString("token"), tokenId = parsed.getString("tokenId"))
            }
        } catch (e: Exception) {
            LoginResult.Failure("${e::class.simpleName}: ${e.message}")
        }
    }
}

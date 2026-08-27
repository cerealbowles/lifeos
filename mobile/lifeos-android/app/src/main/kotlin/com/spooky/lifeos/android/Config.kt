package com.spooky.lifeos.android

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * LifeOS base URL + device API token (from POST /api/auth/mobile-login) — same
 * EncryptedSharedPreferences shape as mobile/whoop-bridge's Config.kt.
 */
class LifeosConfig(context: Context) {
    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "lifeos_config",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun getBaseUrl(): String? = prefs.getString(KEY_BASE_URL, null)
    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)
    /** The user_api_tokens row id this device's own token maps to — lets Settings mark
     *  "this device" in the device list without comparing raw tokens. */
    fun getTokenId(): String? = prefs.getString(KEY_TOKEN_ID, null)

    fun saveBaseUrl(baseUrl: String) {
        prefs.edit().putString(KEY_BASE_URL, baseUrl.trim().trimEnd('/')).apply()
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token.trim()).apply()
    }

    fun saveTokenId(tokenId: String) {
        prefs.edit().putString(KEY_TOKEN_ID, tokenId).apply()
    }

    /** Clears everything, not just the token — used for "sign out & change server," where a
     *  stale base URL paired with no token would otherwise dead-end the login screen. */
    fun clearAll() {
        prefs.edit().clear().apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_TOKEN_ID).apply()
    }

    fun isLoggedIn(): Boolean = !getBaseUrl().isNullOrEmpty() && !getToken().isNullOrEmpty()

    /**
     * Off by default — WhoopSyncService trades battery + a permanent notification for a
     * held-open BLE connection to the strap. Explicit opt-in via the Settings toggle, not
     * turned on just because the device is logged in.
     */
    fun isWhoopSyncEnabled(): Boolean = prefs.getBoolean(KEY_WHOOP_SYNC_ENABLED, false)

    fun setWhoopSyncEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_WHOOP_SYNC_ENABLED, enabled).apply()
    }

    companion object {
        private const val KEY_BASE_URL = "lifeos_base_url"
        private const val KEY_TOKEN = "lifeos_api_token"
        private const val KEY_TOKEN_ID = "lifeos_api_token_id"
        private const val KEY_WHOOP_SYNC_ENABLED = "whoop_sync_enabled"
    }
}

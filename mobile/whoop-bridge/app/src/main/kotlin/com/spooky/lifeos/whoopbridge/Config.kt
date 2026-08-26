package com.spooky.lifeos.whoopbridge

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * LifeOS connection details, entered once in Settings — same scope as the
 * (now-deleted) Flutter build: no in-app OAuth/Settings UI on the LifeOS side yet,
 * so this is the only place these live.
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

    fun save(baseUrl: String, token: String) {
        val normalized = baseUrl.trim().trimEnd('/')
        prefs.edit()
            .putString(KEY_BASE_URL, normalized)
            .putString(KEY_TOKEN, token.trim())
            .apply()
    }

    fun isConfigured(): Boolean = !getBaseUrl().isNullOrEmpty() && !getToken().isNullOrEmpty()

    companion object {
        private const val KEY_BASE_URL = "lifeos_base_url"
        private const val KEY_TOKEN = "lifeos_webhook_token"
    }
}

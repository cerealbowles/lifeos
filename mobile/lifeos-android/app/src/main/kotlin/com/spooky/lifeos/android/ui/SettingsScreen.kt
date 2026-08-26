package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.DeviceInfo
import com.spooky.lifeos.android.sync.SettingsClient
import kotlinx.coroutines.launch

/**
 * Device/token management — the fast-follow the backend's own DELETE /api/auth/tokens/[id]
 * doc comment called for ("a device list to click revoke on"). Shows every device logged into
 * this LifeOS account (GET /api/auth/tokens, added alongside this screen), lets you revoke any
 * of them, and signs this device out (revoking its own token server-side, not just forgetting
 * it locally) via the same endpoint now widened to accept a bearer token, not only a session.
 */
@Composable
fun SettingsScreen(onLogout: () -> Unit) {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    val scope = rememberCoroutineScope()

    var devices by remember { mutableStateOf<List<DeviceInfo>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var signingOut by remember { mutableStateOf(false) }

    fun load() {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return
        loading = true
        scope.launch {
            when (val result = SettingsClient(baseUrl, token).listDevices()) {
                is ApiResult.Success -> {
                    devices = result.value
                    error = null
                }
                is ApiResult.Failure -> error = result.message
            }
            loading = false
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize()) {
        // Header text stays "Settings" (not "More") — the redesign plan's nav mapping renames
        // only the bottom-nav tab label; this screen's actual function is device/token
        // management, and "Settings" is the honest name for that, matching Home/Tasks/Health/
        // Browse each keeping their own accurate in-screen title under a broader nav label.
        Box(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
            Text(
                "Settings",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )
        }

        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
            com.spooky.lifeos.android.ui.components.SectionHeader("SERVER")
            Text(config.getBaseUrl() ?: "—", style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground, modifier = Modifier.padding(top = 2.dp))
        }

        Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
            com.spooky.lifeos.android.ui.components.SectionHeader("DEVICES")
        }

        when {
            loading && devices == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LifeosColors.accent)
            }
            error != null && devices == null -> Box(Modifier.fillMaxWidth().padding(16.dp)) {
                Text("Couldn't load devices — $error", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
            else -> LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 16.dp),
            ) {
                items(devices.orEmpty(), key = { it.id }) { device ->
                    val isThisDevice = device.isCurrent
                    com.spooky.lifeos.android.ui.components.LifeCard(contentPadding = 0.dp) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    if (isThisDevice) "${device.deviceLabel} (this device)" else device.deviceLabel,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = LifeosColors.foreground,
                                )
                                Text(
                                    device.lastUsedAt?.let { "Last used ${it.take(10)}" } ?: "Never used",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = LifeosColors.mutedFg,
                                )
                            }
                            if (!isThisDevice) {
                                TextButton(onClick = {
                                    scope.launch {
                                        val baseUrl = config.getBaseUrl()
                                        val token = config.getToken()
                                        if (baseUrl != null && token != null) {
                                            SettingsClient(baseUrl, token).revoke(device.id)
                                            load()
                                        }
                                    }
                                }) {
                                    Text("Revoke", color = LifeosColors.overdueFg)
                                }
                            }
                        }
                    }
                }
            }
        }

        Button(
            enabled = !signingOut,
            colors = ButtonDefaults.buttonColors(containerColor = LifeosColors.overdueBg, contentColor = LifeosColors.overdueFg),
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            onClick = {
                signingOut = true
                scope.launch {
                    val baseUrl = config.getBaseUrl()
                    val token = config.getToken()
                    val tokenId = config.getTokenId()
                    if (baseUrl != null && token != null && tokenId != null) {
                        SettingsClient(baseUrl, token).revoke(tokenId) // best-effort — sign out locally either way
                    }
                    config.clearAll()
                    onLogout()
                }
            },
        ) {
            Text(if (signingOut) "Signing out…" else "Sign out this device")
        }
    }
}

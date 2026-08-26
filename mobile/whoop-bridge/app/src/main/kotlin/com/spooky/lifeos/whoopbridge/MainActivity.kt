package com.spooky.lifeos.whoopbridge

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.whoopbridge.sync.SyncOrchestrator
import com.spooky.lifeos.whoopbridge.sync.SyncWorker
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions += Manifest.permission.BLUETOOTH_SCAN
            permissions += Manifest.permission.BLUETOOTH_CONNECT
        } else {
            permissions += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions += Manifest.permission.POST_NOTIFICATIONS
        }
        permissionLauncher.launch(permissions.toTypedArray())

        SyncWorker.schedule(applicationContext)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    WhoopBridgeApp()
                }
            }
        }
    }
}

@Composable
fun WhoopBridgeApp() {
    var showSettings by remember { mutableStateOf(false) }

    if (showSettings) {
        SettingsScreen(onDone = { showSettings = false })
    } else {
        HomeScreen(onOpenSettings = { showSettings = true })
    }
}

@Composable
fun HomeScreen(onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var syncing by remember { mutableStateOf(false) }
    val logState = remember { mutableStateListOf<String>() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Whoop Bridge", style = MaterialTheme.typography.headlineSmall)
        Button(onClick = onOpenSettings) { Text("Settings") }
        Button(
            enabled = !syncing,
            onClick = {
                syncing = true
                scope.launch {
                    val result = SyncOrchestrator(context) { message ->
                        android.util.Log.i("WhoopBridgeSync", message)
                        logState.add(0, message)
                    }.runOnce()
                    val summary = "Done: connected=${result.connected} derived=${result.samplesDerived} uploaded=${result.uploaded}"
                    android.util.Log.i("WhoopBridgeSync", summary)
                    logState.add(0, summary)
                    syncing = false
                }
            },
        ) {
            Text(if (syncing) "Syncing…" else "Sync now")
        }
        LazyColumn {
            items(logState) { line -> Text(line, style = MaterialTheme.typography.bodySmall) }
        }
    }
}

@Composable
fun SettingsScreen(onDone: () -> Unit) {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    var url by remember { mutableStateOf(config.getBaseUrl() ?: "") }
    var token by remember { mutableStateOf(config.getToken() ?: "") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("LifeOS URL") },
            placeholder = { Text("https://dunkirk-1.toyger-ruffe.ts.net") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Uri,
                autoCorrectEnabled = false,
                capitalization = KeyboardCapitalization.None,
            ),
        )
        // A stray real-world 401 traced back to this field having no keyboard options —
        // the base64 token (mixed case, +, =) is exactly what default autocorrect/
        // autocapitalize silently corrupts. Password-type + explicit no-autocorrect/
        // no-capitalization stops that class of bug outright, not just this instance.
        OutlinedTextField(
            value = token,
            onValueChange = { token = it },
            label = { Text("WHOOP_WEBHOOK_TOKEN") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                autoCorrectEnabled = false,
                capitalization = KeyboardCapitalization.None,
            ),
        )
        Button(onClick = {
            config.save(url, token)
            onDone()
        }) {
            Text("Save")
        }
    }
}

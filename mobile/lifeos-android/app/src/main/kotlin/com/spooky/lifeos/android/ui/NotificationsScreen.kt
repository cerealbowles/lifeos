package com.spooky.lifeos.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.NotificationRow
import com.spooky.lifeos.android.sync.NotificationsClient
import kotlinx.coroutines.launch

/**
 * Previously web-only (components/notifications) — the in-app notification list, reachable
 * from Settings. Read/mark-read only; a notification's job is done once seen, same as web (no
 * delete affordance there either). Tapping an unread one marks it read.
 */
@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val config = remember { com.spooky.lifeos.android.LifeosConfig(context) }
    val notifClient = remember { NotificationsClient(config.getBaseUrl() ?: "", config.getToken() ?: "") }
    val scope = rememberCoroutineScope()

    var notifications by remember { mutableStateOf<List<NotificationRow>?>(null) }
    var unreadCount by remember { mutableStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var refresh by remember { mutableStateOf(0) }

    LaunchedEffect(refresh) {
        when (val result = notifClient.list()) {
            is ApiResult.Success -> {
                notifications = result.value.first
                unreadCount = result.value.second
                error = null
            }
            is ApiResult.Failure -> error = result.message
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
            }
            Text(
                if (unreadCount > 0) "Notifications ($unreadCount)" else "Notifications",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(start = 4.dp).weight(1f),
            )
            if (unreadCount > 0) {
                TextButton(onClick = { scope.launch { if (notifClient.markAllRead() is ApiResult.Success) refresh++ } }) {
                    Text("Mark all read", color = LifeosColors.accent)
                }
            }
        }

        when {
            notifications == null && error != null -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("Couldn't load notifications — $error", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
            notifications == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LifeosColors.accent)
            }
            notifications.orEmpty().isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("No notifications yet.", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 16.dp),
            ) {
                items(notifications.orEmpty(), key = { it.id }) { n ->
                    com.spooky.lifeos.android.ui.components.LifeCard(
                        onClick = {
                            if (!n.read) scope.launch { if (notifClient.markRead(n.id) is ApiResult.Success) refresh++ }
                        },
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (!n.read) {
                                Box(
                                    modifier = Modifier
                                        .padding(top = 6.dp)
                                        .size(8.dp)
                                        .background(LifeosColors.accent, CircleShape),
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    n.title,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (n.read) LifeosColors.mutedFg else LifeosColors.foreground,
                                )
                                n.body?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg) }
                                Text(n.createdAt.replace("T", " ").take(16), style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
                            }
                        }
                    }
                }
            }
        }
    }
}

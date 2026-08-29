package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * The Daily Rundown card's "More" destination — a full read on the day, no tap targets (per
 * spec, tappability lives only in the short home-card sentence). Fills essentially the whole
 * screen, same plain full-screen Column pattern as WeatherDetailScreen/NotificationsScreen.
 */
@Composable
fun DailyRundownDetailScreen(rundown: DailyRundown?, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
            }
            Text(
                "Today",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(start = 4.dp),
            )
        }
        Text(
            rundown?.detail ?: "Nothing to report yet.",
            style = MaterialTheme.typography.bodyLarge,
            color = LifeosColors.foreground,
            modifier = Modifier.padding(top = 16.dp),
        )
    }
}

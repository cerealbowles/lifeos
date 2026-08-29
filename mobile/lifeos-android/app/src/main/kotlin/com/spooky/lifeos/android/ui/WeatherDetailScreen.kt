package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
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
 * Reachable by tapping the hero's WeatherChip — hourly + 7-day forecast, ported from
 * app/(dashboard)/weather/page.tsx via GET /api/weather?scope=forecast. Plain full-screen
 * column (not a SharedTransitionLayout detail like Browse's rows — this is a chip tap, not a
 * list-row tap, so there's no shared element to animate from).
 */
@Composable
fun WeatherDetailScreen(overview: WeatherOverview?, loading: Boolean, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
            }
            Text(
                "Weather",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(start = 4.dp),
            )
        }
        Box(modifier = Modifier.padding(top = 12.dp)) {
            when {
                loading && overview == null -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LifeosColors.accent)
                }
                overview == null -> Text("Couldn't load the forecast.", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
                else -> {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        WeatherSummary(overview.current)

                        if (overview.hourly.isNotEmpty()) {
                            Column {
                                com.spooky.lifeos.android.ui.components.SectionHeader(title = "HOURLY")
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                                    items(overview.hourly) { hour -> HourlyForecastChip(hour) }
                                }
                            }
                        }

                        if (overview.daily.isNotEmpty()) {
                            Column {
                                com.spooky.lifeos.android.ui.components.SectionHeader(title = "7-DAY")
                                Column(modifier = Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    overview.daily.forEach { day -> DailyForecastRow(day) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HourlyForecastChip(hour: HourlyForecast) {
    Column(
        modifier = Modifier.width(64.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(hourLabel(hour.time), style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg)
        Text("${hour.temperature}°", style = MaterialTheme.typography.titleSmall, color = LifeosColors.foreground)
        if (hour.precipitationChance > 0) {
            Text("${hour.precipitationChance}%", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color(0xFF38BDF8))
        }
    }
}

@Composable
private fun DailyForecastRow(day: DailyForecast) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(dayLabel(day.date), style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground, modifier = Modifier.weight(1f))
        Text(day.conditions, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.mutedFg, modifier = Modifier.weight(1f))
        Text("H${day.high}° L${day.low}°", style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground)
    }
}

private fun hourLabel(iso: String): String = runCatching {
    val instant = java.time.Instant.parse(iso)
    java.time.format.DateTimeFormatter.ofPattern("h a").withZone(java.time.ZoneId.systemDefault()).format(instant)
}.getOrDefault(iso)

private fun dayLabel(iso: String): String = runCatching {
    val instant = java.time.Instant.parse(iso)
    java.time.format.DateTimeFormatter.ofPattern("EEE").withZone(java.time.ZoneId.systemDefault()).format(instant)
}.getOrDefault(iso)

package com.spooky.lifeos.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Thunderstorm
import androidx.compose.material.icons.filled.Umbrella
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/** Mirrors components/weather/condition-icon.tsx's CONDITION_ICON map. */
private fun conditionIcon(conditions: String): ImageVector = when (conditions) {
    "Clear" -> Icons.Filled.WbSunny
    "Rain", "Drizzle" -> Icons.Filled.Umbrella
    "Thunderstorm" -> Icons.Filled.Thunderstorm
    "Snow" -> Icons.Filled.AcUnit
    else -> Icons.Filled.Cloud // Clouds, Mist, Fog, Haze
}

/**
 * Ports components/dashboard/weather-card.tsx — self-suppresses entirely when `weather` is
 * null (not connected), same as the web card's own `if (!weather) return null`, rather than
 * showing an empty/placeholder state for a feature the user hasn't opted into.
 */
@Composable
fun WeatherSummary(weather: WeatherView) {
    val rainLikely = weather.precipitationChance >= 50 || weather.precipitationAmount >= 0.25
    Card(
        colors = CardDefaults.cardColors(containerColor = LifeosColors.glassSurface),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, LifeosColors.glassBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(40.dp).background(Color(0x3338BDF8), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(conditionIcon(weather.conditions), contentDescription = weather.conditions, tint = Color(0xFF38BDF8))
            }
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        "${weather.temperature}°${weather.unit}",
                        style = MaterialTheme.typography.titleMedium,
                        color = LifeosColors.foreground,
                    )
                    Text(
                        "  ${weather.conditions} · H${weather.highToday}° L${weather.lowToday}°",
                        style = MaterialTheme.typography.bodySmall,
                        color = LifeosColors.mutedFg,
                    )
                }
                Text(
                    "${weather.precipitationChance}% chance of rain" +
                        if (weather.precipitationAmount > 0) " · ${weather.precipitationAmount}\" expected" else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = LifeosColors.mutedFg,
                )
                if (rainLikely) {
                    Text(
                        "Rain expected — outdoor watering probably isn't needed today.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF38BDF8),
                    )
                }
            }
        }
    }
}

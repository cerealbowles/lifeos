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
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

// Same palette mapping as the web's skin-temp-baseline-card.tsx STATUS_VARIANT — reuses
// LifeosColors' existing overdue/due-soon reds/ambers rather than inventing new colors.
private fun statusColor(status: String?): Pair<Color, Color> = when (status) {
    "high", "very_low" -> LifeosColors.overdueBg to LifeosColors.overdueFg
    "elevated", "low" -> LifeosColors.dueSoonBg to LifeosColors.dueSoonFg
    "normal" -> Color(0xFF022C22) to Color(0xFF34D399) // emerald-950/400, matching domainColor("financial")'s success tone
    else -> LifeosColors.mutedBg to LifeosColors.mutedFg
}

private fun statusLabel(status: String?): String = when (status) {
    "high" -> "Well above baseline"
    "elevated" -> "Above baseline"
    "normal" -> "Normal"
    "low" -> "Below baseline"
    "very_low" -> "Well below baseline"
    else -> ""
}

// Muted sage-teal instead of the old sky blue (0x0EA5E9, a leftover navy-palette hardcode,
// same category of bug as WhoopReadingCell's rose heart icon) — still reads as "cool/temperature"
// next to the warm copper heart icon, but sits inside the earth palette rather than clashing
// with it.
private val skinTempAccent = Color(0xFF7C9A92)

/** Ports components/health/skin-temp-baseline-card.tsx. */
@Composable
fun SkinTempCard(baseline: SkinTempBaseline) {
    com.spooky.lifeos.android.ui.components.LifeCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(36.dp).background(skinTempAccent.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Thermostat, contentDescription = null, tint = skinTempAccent, modifier = Modifier.size(18.dp))
            }
            Column(modifier = Modifier.padding(start = 10.dp)) {
                if (baseline.latestValue == null) {
                    Text(
                        "Not connected yet — pair the Whoop Bridge companion app to start syncing.",
                        style = MaterialTheme.typography.bodySmall,
                        color = LifeosColors.mutedFg,
                    )
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.spooky.lifeos.android.ui.motion.AnimatedNumber(
                            value = baseline.latestValue,
                            format = { "${"%.1f".format(it)}°${baseline.latestUnit}" },
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = LifeosColors.foreground,
                        )
                        if (baseline.status != null) {
                            val (bg, fg) = statusColor(baseline.status)
                            Box(modifier = Modifier.padding(start = 8.dp).background(bg, RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp)) {
                                Text(statusLabel(baseline.status), color = fg, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    Text(
                        if (baseline.baseline != null) {
                            "Baseline ${"%.1f".format(baseline.baseline)}°${baseline.latestUnit} (${baseline.baselineSampleCount} readings) · " +
                                (if ((baseline.deviation ?: 0.0) >= 0) "+" else "") + "%.1f".format(baseline.deviation) + "°"
                        } else {
                            "Still building a baseline (${baseline.baselineSampleCount} reading${if (baseline.baselineSampleCount == 1) "" else "s"} so far)"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = LifeosColors.mutedFg,
                    )
                }
            }
        }
    }
}

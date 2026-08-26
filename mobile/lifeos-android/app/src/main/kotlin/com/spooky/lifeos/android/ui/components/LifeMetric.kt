package com.spooky.lifeos.android.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.ui.LifeosColors

/**
 * One "at a glance" stat card — brief §7's Home mockup 2×2 grid (Tasks/Habits/Health/Focus).
 * Value in the serif display face (via `titleLarge`'s LifeSerif override in
 * `LifeTypography.kt`), label small and muted beneath it.
 */
@Composable
fun LifeMetric(label: String, value: String, modifier: Modifier = Modifier) {
    LifeCard(modifier = modifier) {
        Column {
            Text(value, style = MaterialTheme.typography.titleLarge, color = LifeosColors.foreground, fontWeight = FontWeight.SemiBold)
            Text(label, style = MaterialTheme.typography.labelMedium, color = LifeosColors.mutedFg, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

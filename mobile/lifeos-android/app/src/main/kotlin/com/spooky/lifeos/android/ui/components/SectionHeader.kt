package com.spooky.lifeos.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.spooky.lifeos.android.ui.LifeosColors

/**
 * Replaces the various ad hoc section-title `Text`s scattered across screens (HealthScreen's
 * private `SectionLabel`, Browse's plain domain-chip row title, etc.) with one shared,
 * serif-styled (`titleMedium`) header — optionally with a trailing action like the brief's
 * mockup "See all" links.
 */
@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = LifeosColors.foreground)
        trailing?.invoke()
    }
}

package com.spooky.lifeos.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.ui.LifeosColors

/**
 * "Things to tend to" row — brief §7's Home mockup timeline (a dot per item, title + optional
 * subtitle, trailing status). A lighter-weight sibling to `TodayItemRow`
 * (TodayComponents.kt, kept as-is — Today/Tasks still use their own domain-avatar-based row);
 * this is for Home's trimmed "at a glance" list where a plain accent dot reads better than a
 * full domain icon circle.
 *
 * No connecting vertical line between dots yet (the brief's mockup implies one) — a real visual
 * nicety, deliberately deferred to Phase 2 once there's an actual list of these on screen to
 * tune it against, rather than guessing the right line weight/spacing in isolation now.
 */
@Composable
fun TimelineItem(
    title: String,
    subtitle: String? = null,
    accentColor: Color = LifeosColors.accent,
    trailing: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(10.dp).background(accentColor, CircleShape))
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground)
            subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg) }
        }
        trailing?.invoke()
    }
}

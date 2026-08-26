package com.spooky.lifeos.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.ui.LifeosColors

/**
 * The "frosted glass over the landscape" card treatment that used to be copy-pasted into every
 * screen file (`CardDefaults.cardColors(containerColor = LifeosColors.glassSurface), shape =
 * RoundedCornerShape(18.dp), border = BorderStroke(1.dp, LifeosColors.glassBorder), elevation =
 * CardDefaults.cardElevation(defaultElevation = 0.dp)` — found identically in HealthScreen's
 * `TrendCard`, TasksScreen's `TaskRow`, BrowseScreen's row `Card`, TodayComponents' rows, and
 * SleepComponents' log card). One definition now; screens should adopt this instead of
 * re-declaring the same five parameters.
 *
 * Deliberately just a `Box` inside, not a `Column` — different screens put a `Row`, a
 * `Column`, or a single `Text` directly inside today, and forcing a `Column` here would fight
 * whichever layout a given screen actually needs. `onClick` is optional so this covers both
 * Card overloads (static display vs. tappable row) from one call site, matching how
 * `Card(onClick = ...)` was adopted for Browse rows this session.
 */
@Composable
fun LifeCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentPadding: Dp = 14.dp,
    content: @Composable () -> Unit,
) {
    val colors = CardDefaults.cardColors(containerColor = LifeosColors.glassSurface)
    val shape = RoundedCornerShape(18.dp)
    val border = BorderStroke(1.dp, LifeosColors.glassBorder)
    val elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)

    if (onClick != null) {
        Card(onClick = onClick, colors = colors, shape = shape, border = border, elevation = elevation, modifier = modifier) {
            Box(modifier = Modifier.padding(contentPadding)) { content() }
        }
    } else {
        Card(colors = colors, shape = shape, border = border, elevation = elevation, modifier = modifier) {
            Box(modifier = Modifier.padding(contentPadding)) { content() }
        }
    }
}

package com.spooky.lifeos.android.ui.motion

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight

/**
 * Counts smoothly from its previous value to `value` instead of snapping — e.g. HRV 78 → 82.
 * A plain `Text` displaying `animateFloatAsState`'s current frame value, formatted the same
 * way every time. `value` changing (a real state update — a fresh sync, a data refresh) is
 * what drives the animation; this is a one-shot settle on each change, not a continuous loop.
 */
@Composable
fun AnimatedNumber(
    value: Double,
    modifier: Modifier = Modifier,
    format: (Double) -> String = { "%.1f".format(it) },
    style: TextStyle = LocalTextStyleOrBody(),
    color: Color = LocalContentColor.current,
    fontWeight: FontWeight? = null,
) {
    val animated by animateFloatAsState(targetValue = value.toFloat(), animationSpec = Motion.GentleSpring, label = "AnimatedNumber")
    Text(format(animated.toDouble()), modifier = modifier, style = style, color = color, fontWeight = fontWeight)
}

/** Integer convenience — pending counts, NOW counts, anything that should count by whole steps. */
@Composable
fun AnimatedInt(
    value: Int,
    modifier: Modifier = Modifier,
    format: (Int) -> String = { it.toString() },
    style: TextStyle = LocalTextStyleOrBody(),
    color: Color = LocalContentColor.current,
    fontWeight: FontWeight? = null,
) {
    val animated by animateFloatAsState(targetValue = value.toFloat(), animationSpec = Motion.GentleSpring, label = "AnimatedInt")
    Text(format(animated.toInt()), modifier = modifier, style = style, color = color, fontWeight = fontWeight)
}

@Composable
private fun LocalTextStyleOrBody(): TextStyle = MaterialTheme.typography.bodyMedium

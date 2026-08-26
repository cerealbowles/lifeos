package com.spooky.lifeos.android.ui.motion

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A ring that animates its sweep from whatever it was previously showing to `progress`
 * whenever `progress` changes — "draws itself" on every data refresh, not just on first
 * appearance, since `animateFloatAsState` retargets from its current value automatically.
 * Hand-drawn Canvas arc, matching this codebase's existing "no charting library" discipline
 * (DECISIONS.md ADR-092) for the web app's own hand-rolled SVG charts.
 */
@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    diameter: Dp = 40.dp,
    strokeWidth: Dp = 4.dp,
    trackColor: Color,
    progressColor: Color,
    content: @Composable () -> Unit = {},
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = Motion.GentleSpring,
        label = "ProgressRing",
    )

    Box(modifier = modifier.size(diameter)) {
        Canvas(modifier = Modifier.size(diameter)) {
            val stroke = Stroke(width = strokeWidth.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
            val inset = strokeWidth.toPx() / 2
            val arcSize = Size(size.width - strokeWidth.toPx(), size.height - strokeWidth.toPx())
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = androidx.compose.ui.geometry.Offset(inset, inset),
                size = arcSize,
                style = stroke,
            )
            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = 360f * animatedProgress,
                useCenter = false,
                topLeft = androidx.compose.ui.geometry.Offset(inset, inset),
                size = arcSize,
                style = stroke,
            )
        }
        Box(modifier = Modifier.size(diameter), contentAlignment = androidx.compose.ui.Alignment.Center) {
            content()
        }
    }
}

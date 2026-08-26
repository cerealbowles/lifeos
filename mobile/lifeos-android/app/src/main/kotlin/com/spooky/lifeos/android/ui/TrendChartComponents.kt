package com.spooky.lifeos.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import java.time.Instant
import kotlin.math.max

/**
 * Native counterpart to components/health/measurement-trend-chart.tsx's hand-rolled SVG line
 * chart (DECISIONS.md ADR-092) — same "no charting library" discipline via Compose Canvas
 * instead of SVG, same min/max + first/last-date labeling, no gridlines.
 */
@Composable
fun TrendLineChart(points: List<TrendPoint>, unit: String, emptyLabel: String = "No readings yet") {
    if (points.size < 2) {
        Text(
            if (points.isEmpty()) emptyLabel else "Add one more reading to see a trend.",
            color = LifeosColors.mutedFg,
            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
        )
        return
    }

    val values = points.map { it.value }
    val minValue = values.min()
    val maxValue = values.max()
    val spread = max(maxValue - minValue, 1.0)
    val yMin = minValue - spread * 0.15
    val yMax = maxValue + spread * 0.15

    val times = points.mapNotNull { runCatching { Instant.parse(it.measuredAt).toEpochMilli() }.getOrNull() }
    val minTime = times.minOrNull() ?: 0L
    val maxTime = times.maxOrNull() ?: 1L
    val timeSpread = max((maxTime - minTime).toDouble(), 1.0)

    Column {
        Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
            val w = size.width
            val h = size.height
            val coords = points.mapIndexedNotNull { i, p ->
                val t = times.getOrNull(i) ?: return@mapIndexedNotNull null
                val x = ((t - minTime) / timeSpread * w).toFloat()
                val y = (h - ((p.value - yMin) / (yMax - yMin) * h)).toFloat()
                Offset(x, y)
            }
            if (coords.size < 2) return@Canvas

            for (i in 1 until coords.size) {
                drawLine(color = LifeosColors.accent, start = coords[i - 1], end = coords[i], strokeWidth = 4f)
            }
            for (c in coords) {
                drawCircle(color = LifeosColors.accent, radius = 5f, center = c)
            }
        }
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
        ) {
            Text(
                "${"%.1f".format(minValue)}–${"%.1f".format(maxValue)} $unit",
                color = LifeosColors.mutedFg,
                style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
            )
        }
    }
}

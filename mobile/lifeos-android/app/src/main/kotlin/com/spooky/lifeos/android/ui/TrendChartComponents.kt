package com.spooky.lifeos.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.ui.motion.AnimatedNumber
import java.time.Instant
import kotlin.math.max

/**
 * Native counterpart to components/health/measurement-trend-chart.tsx's hand-rolled SVG line
 * chart (DECISIONS.md ADR-092) — same "no charting library" discipline via Compose Canvas
 * instead of SVG. Elevated past the original bare polyline: a smoothed curve (quadratic
 * bezier through segment midpoints — the standard trick for a smooth line from a raw
 * polyline without pulling in a spline library), a gradient area fill so the shape reads at
 * a glance, faint horizontal gridlines for scale, and the latest reading called out both as
 * a ringed dot on the line and as a headline number above it.
 */
@Composable
fun TrendLineChart(points: List<TrendPoint>, unit: String, emptyLabel: String = "No readings yet") {
    if (points.size < 2) {
        Text(
            if (points.isEmpty()) emptyLabel else "Add one more reading to see a trend.",
            color = LifeosColors.mutedFg,
            style = MaterialTheme.typography.bodySmall,
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Text("Now", style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg)
            AnimatedNumber(
                value = values.last(),
                format = { "${"%.1f".format(it)} $unit" },
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = LifeosColors.foreground,
            )
        }

        Canvas(modifier = Modifier.fillMaxWidth().height(140.dp).padding(top = 6.dp)) {
            val w = size.width
            val h = size.height

            // Faint horizontal gridlines — three even bands, not a full axis, just enough
            // scaffolding to read the curve's shape against.
            val gridLines = 3
            for (i in 0..gridLines) {
                val y = h / gridLines * i
                drawLine(
                    color = LifeosColors.glassBorder,
                    start = Offset(0f, y),
                    end = Offset(w, y),
                    strokeWidth = 1.5f,
                )
            }

            val coords = points.mapIndexedNotNull { i, p ->
                val t = times.getOrNull(i) ?: return@mapIndexedNotNull null
                val x = ((t - minTime) / timeSpread * w).toFloat()
                val y = (h - ((p.value - yMin) / (yMax - yMin) * h)).toFloat()
                Offset(x, y)
            }
            if (coords.size < 2) return@Canvas

            // Smoothed line: a quadratic bezier from each point to the midpoint of the next
            // segment, using the point itself as the control — turns the raw polyline into a
            // continuous curve without a spline library.
            val linePath = Path().apply {
                moveTo(coords[0].x, coords[0].y)
                for (i in 0 until coords.size - 1) {
                    val p0 = coords[i]
                    val p1 = coords[i + 1]
                    val mid = Offset((p0.x + p1.x) / 2f, (p0.y + p1.y) / 2f)
                    quadraticTo(p0.x, p0.y, mid.x, mid.y)
                }
                lineTo(coords.last().x, coords.last().y)
            }

            val fillPath = Path().apply {
                addPath(linePath)
                lineTo(coords.last().x, h)
                lineTo(coords.first().x, h)
                close()
            }
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(LifeosColors.accent.copy(alpha = 0.28f), LifeosColors.accent.copy(alpha = 0f)),
                    startY = 0f,
                    endY = h,
                ),
            )

            drawPath(path = linePath, color = LifeosColors.accent, style = Stroke(width = 4f, cap = StrokeCap.Round))

            // Every point gets a small dot; the latest reading gets a bigger one plus an
            // outer ring so it reads as "this is where you are now," not just another sample.
            for (c in coords.dropLast(1)) {
                drawCircle(color = LifeosColors.accent.copy(alpha = 0.5f), radius = 3f, center = c)
            }
            val last = coords.last()
            drawCircle(color = LifeosColors.accent.copy(alpha = 0.25f), radius = 11f, center = last)
            drawCircle(color = LifeosColors.background, radius = 7f, center = last)
            drawCircle(color = LifeosColors.accent, radius = 5.5f, center = last)
        }

        Text(
            "${"%.1f".format(minValue)}–${"%.1f".format(maxValue)} $unit range",
            color = LifeosColors.mutedFg,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

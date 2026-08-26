package com.spooky.lifeos.android.ui.environment

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope

/**
 * Layered Canvas landscape — sky handled by the caller's own background brush
 * (EnvironmentalBackground.kt), this draws everything below it: an ambient glow (sun/moon
 * proxy), a horizon band, two mountain ranges, and a treeline silhouette. Deliberately simple
 * geometric shapes per the design brief's own instruction (§8): "the initial implementation
 * can use simple vector/Canvas shapes... later, the system can support richer artwork." No
 * bundled image assets.
 *
 * Peak/tooth positions use a small deterministic pattern keyed on index (not `Random`) so the
 * silhouette shape is stable across recompositions — only `style`'s colors animate during a
 * day-phase crossfade; the skyline itself must not visibly reshuffle every frame.
 *
 * `showStars` adds the brief's explicit §2 "Night: ... moonlight, stars" detail, previously
 * missing entirely — confined to the upper sky so it never competes with the mountains/treeline.
 * The horizon haze band right above the ridgeline is new too (direct user feedback: "the
 * mountains are very dark now") — a soft warm wash that reads as atmospheric depth/mist rather
 * than a flat silhouette, on top of [EnvironmentStyle]'s brighter daytime retune.
 */
@Composable
fun MountainScene(style: EnvironmentStyle, glowDrift: Float, showStars: Boolean = false, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        val drift = glowDrift - 0.5f

        if (showStars) {
            drawStars(width = w, height = h)
        }

        // Ambient glow — sun/moon proxy, soft radial haze, gently drifting.
        val glowCenter = Offset(w * (0.74f + drift * 0.02f), h * (0.20f + drift * 0.015f))
        val glowRadius = w * 0.55f
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(style.ambientGlow.copy(alpha = 0.30f + drift * 0.06f), style.ambientGlow.copy(alpha = 0f)),
                center = glowCenter,
                radius = glowRadius,
            ),
            radius = glowRadius,
            center = glowCenter,
            blendMode = BlendMode.Plus,
        )

        // Horizon band — a soft warm line where sky meets mountains.
        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(style.horizon.copy(alpha = 0f), style.horizon.copy(alpha = 0.30f), style.horizon.copy(alpha = 0f)),
                startY = h * 0.42f,
                endY = h * 0.66f,
            ),
            topLeft = Offset(0f, h * 0.42f),
            size = Size(w, h * 0.24f),
        )

        drawMountainRange(
            color = style.mountainFar,
            baseY = h * 0.66f,
            amplitude = h * 0.16f,
            peakXs = listOf(0.05f, 0.22f, 0.40f, 0.58f, 0.78f, 0.95f),
            width = w,
            height = h,
        )

        // Atmospheric haze — a soft horizon-tinted wash right above the near ridgeline, reading
        // as depth/mist rather than the far range just being a flat solid shape butting up
        // against the near one.
        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(style.horizon.copy(alpha = 0f), style.horizon.copy(alpha = 0.18f)),
                startY = h * 0.60f,
                endY = h * 0.78f,
            ),
            topLeft = Offset(0f, h * 0.60f),
            size = Size(w, h * 0.18f),
        )

        drawMountainRange(
            color = style.mountainNear,
            baseY = h * 0.78f,
            amplitude = h * 0.22f,
            peakXs = listOf(-0.05f, 0.15f, 0.35f, 0.55f, 0.75f, 0.90f, 1.05f),
            width = w,
            height = h,
        )
        drawTreeline(color = style.forest, baseY = h * 0.92f, width = w, height = h)
    }
}

/** Sparse, deterministic (index-derived, no `Random`) star field confined to the upper ~40% of
 *  the sky so it reads as background depth rather than clutter near the skyline. */
private fun DrawScope.drawStars(width: Float, height: Float) {
    val starCount = 26
    for (i in 0 until starCount) {
        val x = width * ((i * 71) % 97) / 97f
        val y = height * (0.04f + 0.36f * ((i * 53) % 41) / 41f)
        val radius = 1f + (i % 3) * 0.6f
        val alpha = 0.35f + (i % 4) * 0.15f
        drawCircle(color = Color(0xFFE8DDC9).copy(alpha = alpha), radius = radius, center = Offset(x, y))
    }
}

/**
 * One rolling silhouette range, filled solid — a mountain ridge is a closed polygon from the
 * canvas floor up to the ridgeline and back down, not an open stroked line.
 *
 * Found live: connecting the raw peak points with straight `lineTo` segments reads as sharp
 * angular triangles, not mountains — the fix isn't Bezier control-point math, it's just
 * sampling the ridge densely (80 points) and cosine-interpolating the height between each pair
 * of named peaks, so the "curve" is really a fine polyline that reads as smooth rolling hills
 * to the eye at any normal viewing distance.
 */
private fun DrawScope.drawMountainRange(color: Color, baseY: Float, amplitude: Float, peakXs: List<Float>, width: Float, height: Float) {
    val peakHeights = peakXs.mapIndexed { i, _ -> amplitude * (0.55f + 0.45f * ((i * 37) % 5) / 4f) }
    val samples = 80
    val path = Path().apply {
        moveTo(0f, height)
        lineTo(0f, baseY)
        for (s in 0..samples) {
            val xFrac = s / samples.toFloat()
            lineTo(width * xFrac, baseY - ridgeHeightAt(xFrac, peakXs, peakHeights))
        }
        lineTo(width, baseY)
        lineTo(width, height)
        close()
    }
    drawPath(path, color = color)
}

/** Cosine (ease-in-out) interpolation between the two peaks straddling `xFrac` — rounded hills
 *  instead of linear ramps between raw peak points. `peakXs` is assumed sorted ascending. */
private fun ridgeHeightAt(xFrac: Float, peakXs: List<Float>, peakHeights: List<Float>): Float {
    if (xFrac <= peakXs.first()) return peakHeights.first()
    if (xFrac >= peakXs.last()) return peakHeights.last()
    for (i in 0 until peakXs.size - 1) {
        val x0 = peakXs[i]
        val x1 = peakXs[i + 1]
        if (xFrac in x0..x1) {
            val t = (xFrac - x0) / (x1 - x0)
            val eased = (1f - kotlin.math.cos(t * Math.PI.toFloat())) / 2f
            return peakHeights[i] + (peakHeights[i + 1] - peakHeights[i]) * eased
        }
    }
    return peakHeights.last()
}

/** Sparse standalone pine-tree silhouettes standing on the near ridge, matching the reference
 *  art's look — a handful of individually-readable triangles with gaps between them, not a
 *  continuous jagged wall. Found live: a dense edge-to-edge sawtooth (the previous approach)
 *  reads as "sharp/rough" even once the mountain ridges themselves are smoothly interpolated,
 *  because it's the busiest, most angular shape on screen. Fewer, narrower, gapped trees read
 *  as a calm treeline instead. A slim two-segment trunk under each canopy sells the "tree" read
 *  rather than a plain triangle. */
private fun DrawScope.drawTreeline(color: Color, baseY: Float, width: Float, height: Float) {
    val treeCount = 14
    val slot = width / treeCount
    for (i in 0 until treeCount) {
        val jitter = (((i * 41) % 11) / 10f - 0.5f) * slot * 0.5f
        val cx = slot * (i + 0.5f) + jitter
        val treeHeight = (height - baseY) * (0.22f + 0.3f * ((i * 53) % 7) / 6f)
        val treeWidth = slot * (0.30f + 0.18f * ((i * 29) % 5) / 4f)
        val trunk = treeHeight * 0.12f
        val path = Path().apply {
            moveTo(cx - treeWidth * 0.14f, baseY)
            lineTo(cx - treeWidth * 0.14f, baseY - trunk)
            lineTo(cx - treeWidth / 2f, baseY - trunk)
            lineTo(cx, baseY - treeHeight)
            lineTo(cx + treeWidth / 2f, baseY - trunk)
            lineTo(cx + treeWidth * 0.14f, baseY - trunk)
            lineTo(cx + treeWidth * 0.14f, baseY)
            close()
        }
        drawPath(path, color = color)
    }
}

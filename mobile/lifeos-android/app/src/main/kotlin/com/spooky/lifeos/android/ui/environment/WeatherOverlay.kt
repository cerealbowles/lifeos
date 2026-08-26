package com.spooky.lifeos.android.ui.environment

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Ports lib/weather/ambient.ts's `ambientMoodFromConditions()` exactly — same three mapped
 * moods, same "or nothing for Clear/unmapped" fallback (`null` here, `null` there too). See
 * components/dashboard/ambient-weather.tsx for the web counterpart this mirrors.
 */
enum class AmbientMood { CLOUDS, RAIN, SNOW }

private val RAIN_CONDITIONS = setOf("Rain", "Drizzle", "Thunderstorm")
private val SNOW_CONDITIONS = setOf("Snow")
private val CLOUDS_CONDITIONS = setOf("Clouds", "Mist", "Fog", "Haze", "Smoke", "Dust", "Sand", "Ash")

fun ambientMoodFromConditions(conditions: String?): AmbientMood? = when (conditions) {
    null -> null
    in RAIN_CONDITIONS -> AmbientMood.RAIN
    in SNOW_CONDITIONS -> AmbientMood.SNOW
    in CLOUDS_CONDITIONS -> AmbientMood.CLOUDS
    else -> null // "Clear", or anything unmapped — no decoration.
}

/**
 * Weather-driven layer drawn on top of [MountainScene] inside [EnvironmentalBackground] — direct
 * user request ("I want the weather to play a part in the backdrop"). Same visual grammar as the
 * web app's `AmbientWeather`: clouds stay a fully static haze (no motion), rain/snow get the same
 * scoped, deliberate exception to this codebase's "no continuous/decorative animation" rule that
 * DECISIONS.md ADR-104 already established for the web version — extended here to native rather
 * than re-litigated, since it's the same effect for the same reason.
 */
@Composable
fun WeatherOverlay(mood: AmbientMood?, modifier: Modifier = Modifier) {
    when (mood) {
        null -> Unit
        AmbientMood.CLOUDS -> CloudsOverlay(modifier)
        AmbientMood.RAIN -> RainOverlay(modifier)
        AmbientMood.SNOW -> SnowOverlay(modifier)
    }
}

/** Static hazy wash — three soft, low-opacity blobs, no motion. Mirrors the web version's
 *  blurred-circle "CloudsBackdrop" using a radial gradient instead of a CSS blur. */
@Composable
private fun CloudsOverlay(modifier: Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        fun blob(cx: Float, cy: Float, r: Float, alpha: Float) {
            drawCircle(
                brush = Brush.radialGradient(colors = listOf(Color.White.copy(alpha = alpha), Color.Transparent), center = Offset(cx, cy), radius = r),
                radius = r,
                center = Offset(cx, cy),
            )
        }
        blob(w * 0.18f, h * 0.22f, w * 0.32f, 0.10f)
        blob(w * 0.78f, h * 0.32f, w * 0.28f, 0.08f)
        blob(w * 0.50f, h * 0.12f, w * 0.38f, 0.07f)
    }
}

/** A fixed set of falling streaks, deterministically placed/timed (index-derived, no `Random`)
 *  — one shared clock drives every streak's phase-shifted fall, matching the web version's
 *  per-drop delay/duration variation without needing a transition per drop. */
@Composable
private fun RainOverlay(modifier: Modifier) {
    val transition = rememberInfiniteTransition(label = "RainFall")
    val t by transition.animateFloat(0f, 1f, infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart), label = "RainT")
    val dropCount = 18

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        val dropLength = h * 0.09f
        for (i in 0 until dropCount) {
            val speed = 0.7f + (i % 4) * 0.12f
            val phase = ((t * speed) + i.toFloat() / dropCount) % 1f
            val x = w * ((i * 53) % 97) / 97f
            val y = -dropLength + phase * (h + dropLength)
            // Fades in/out over its own fall rather than popping at the top/bottom edges.
            val alpha = kotlin.math.sin((phase.coerceIn(0f, 1f)) * Math.PI.toFloat()).coerceIn(0f, 1f) * 0.5f
            drawLine(
                color = Color(0xFF9CC7E8).copy(alpha = alpha),
                start = Offset(x, y),
                end = Offset(x + dropLength * 0.12f, y + dropLength),
                strokeWidth = 2.2f,
            )
        }
    }
}

/** Falling flakes with a gentle side-to-side sway rather than a straight drop — same "reads as
 *  actual snow" reasoning as the web version's `snow-fall` keyframes. */
@Composable
private fun SnowOverlay(modifier: Modifier) {
    val transition = rememberInfiniteTransition(label = "SnowFall")
    val t by transition.animateFloat(0f, 1f, infiniteRepeatable(tween(6000, easing = LinearEasing), RepeatMode.Restart), label = "SnowT")
    val flakeCount = 16

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        for (i in 0 until flakeCount) {
            val speed = 0.6f + (i % 4) * 0.15f
            val phase = ((t * speed) + i.toFloat() / flakeCount) % 1f
            val baseX = w * ((i * 31) % 97) / 97f
            val sway = kotlin.math.sin(phase * Math.PI.toFloat() * 2f) * w * 0.025f // kept explicit Float literal
            val y = phase * (h + 20f) - 10f
            val radius = 2f + (i % 3)
            val alpha = 0.5f + (i % 3) * 0.15f
            drawCircle(color = Color.White.copy(alpha = alpha), radius = radius, center = Offset(baseX + sway, y))
        }
    }
}

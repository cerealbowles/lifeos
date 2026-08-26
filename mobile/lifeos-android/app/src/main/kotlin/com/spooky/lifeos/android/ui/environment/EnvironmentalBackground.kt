package com.spooky.lifeos.android.ui.environment

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.spooky.lifeos.android.ui.WeatherView
import com.spooky.lifeos.android.ui.motion.Motion
import kotlinx.coroutines.delay
import java.time.LocalTime

/**
 * Earth-tone successor to the old `AuroraBackground` (Background.kt, deleted as part of the
 * design-brief redesign) — same structural idea (root-level backdrop, time-of-day palette
 * crossfade, one slow ambient motion layer) reinterpreted as a landscape instead of glow blobs.
 * Sits once at the root behind everything (`MainActivity.kt`), same as before.
 *
 * Two motion layers, same discipline as the aurora's (deliberate, scoped override of this
 * codebase's "no continuous/decorative animation" principle — see `ui/motion/MotionSpecs.kt`):
 * 1. Time-of-day palette — [DayPhase] checked once a minute, each [EnvironmentStyle] color
 *    crossfades over 4s rather than snapping.
 * 2. Ambient glow drift — the sun/moon proxy in [MountainScene] nudges gently on the same
 *    ~24s reverse cycle the aurora used for its blobs ("clouds moving extremely slowly," per
 *    the brief's own Motion section). One drifting light source now, not four independent
 *    blobs — a landscape only has one sun/moon.
 *
 * `weather` (direct user request, 2026-08-26 — "I want the weather to play a part in the
 * backdrop") drives a third, optional layer: [WeatherOverlay] renders clouds/rain/snow on top of
 * the mountains when conditions map to one of those moods (see `ambientMoodFromConditions`),
 * nothing extra for clear skies or a `null` (not-yet-loaded/not-connected) reading — same
 * "suppress when there's nothing to say" instinct the web version already uses.
 */
@Composable
fun EnvironmentalBackground(modifier: Modifier = Modifier, weather: WeatherView? = null) {
    var now by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(60_000)
            now = LocalTime.now()
        }
    }
    val phase = dayPhase(now)
    val target = environmentStyle(phase)
    val fade = tween<Color>(durationMillis = 4_000)

    val skyTop by animateColorAsState(target.skyTop, fade, label = "EnvSkyTop")
    val skyBottom by animateColorAsState(target.skyBottom, fade, label = "EnvSkyBottom")
    val horizon by animateColorAsState(target.horizon, fade, label = "EnvHorizon")
    val mountainFar by animateColorAsState(target.mountainFar, fade, label = "EnvMountainFar")
    val mountainNear by animateColorAsState(target.mountainNear, fade, label = "EnvMountainNear")
    val forest by animateColorAsState(target.forest, fade, label = "EnvForest")
    val accent by animateColorAsState(target.accent, fade, label = "EnvAccent")
    val ambientGlow by animateColorAsState(target.ambientGlow, fade, label = "EnvAmbientGlow")
    val animatedStyle = EnvironmentStyle(skyTop, skyBottom, horizon, mountainFar, mountainNear, forest, accent, ambientGlow)

    val transition = rememberInfiniteTransition(label = "EnvBreath")
    val glowDrift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(animation = Motion.ambientTween(), repeatMode = RepeatMode.Reverse),
        label = "EnvGlowDrift",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(skyTop, skyBottom))),
    ) {
        MountainScene(style = animatedStyle, glowDrift = glowDrift, showStars = phase == DayPhase.NIGHT, modifier = Modifier.fillMaxSize())
        WeatherOverlay(mood = ambientMoodFromConditions(weather?.conditions), modifier = Modifier.fillMaxSize())
    }
}

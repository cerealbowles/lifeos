package com.spooky.lifeos.android.ui.motion

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween

/**
 * Shared timing/easing tokens for the native app's motion system — a deliberate, scoped
 * override of the rest of this codebase's documented "no continuous/decorative animation"
 * principle (see PulseIndicator/AuroraBackground's own doc comments for the original
 * reasoning), confirmed explicitly with the user rather than silently diverging. Centralized
 * here so every effect (nav pill, gesture release, number morphing, rings, ambient drift)
 * shares consistent feel instead of each file picking its own magic numbers.
 */
object Motion {
    /** Snappy, slightly bouncy — press feedback, nav pill sliding, swipe release. */
    val SnappySpring: SpringSpec<Float> = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)

    /** Softer, no overshoot — number morphing, progress rings, card expansion. */
    val GentleSpring: SpringSpec<Float> = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessLow)

    /** Very slow, linear — ambient/breathing loops (aurora drift, attention pulse). Not for
     *  anything state-driven; only for the two effects explicitly scoped for continuous
     *  motion in the plan (DECISIONS.md's "no decorative looping" still applies everywhere
     *  else). */
    const val AMBIENT_CYCLE_MS = 24_000

    fun <T> ambientTween() = tween<T>(durationMillis = AMBIENT_CYCLE_MS, easing = androidx.compose.animation.core.LinearEasing)
}

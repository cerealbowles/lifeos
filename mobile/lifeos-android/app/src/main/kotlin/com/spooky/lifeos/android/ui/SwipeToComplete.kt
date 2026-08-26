package com.spooky.lifeos.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import kotlin.math.min

/**
 * Swipe-right-to-complete, the native-idiomatic equivalent of components/dashboard/swipe-to-
 * complete.tsx (which hand-rolled pointer events for the browser). Compose has a proper gesture
 * primitive for this exact interaction — SwipeToDismissBox — so this wraps that instead of
 * re-implementing pointer tracking; behavior matches the web version's intent (swipe right past
 * a threshold reveals a green check and fires the action) even though the mechanism differs.
 * Swipe-left is disabled (`enableDismissFromEndToStart = false`) — completing is the only
 * gesture-driven action here, same as the web version being right-only.
 *
 * Gesture-physics polish: kept `SwipeToDismissBox` rather than rewriting onto raw
 * `AnchoredDraggableState` (the compiler's deprecation warning has no replacement API yet per
 * its own message — migrating now would mean hand-rebuilding anchor/threshold/fling logic
 * Material3 already gets right, purely to silence a warning with nowhere better to land).
 * Instead, `state.requireOffset()` (the live drag distance Material3 already tracks) drives a
 * subtle scale-up + elevation "lift" while actively dragging — real physics feedback without
 * touching the proven, already-device-verified gesture handling underneath.
 *
 * `onComplete` is suspend and returns whether it actually succeeded: `confirmValueChange` itself
 * must answer synchronously (Compose can't await a network call mid-gesture), so the swipe
 * commits its animation immediately and a `LaunchedEffect` keyed on the settled state performs
 * the real (possibly network) action afterward — `state.reset()` on failure un-dismisses the row
 * instead of leaving it stuck hidden when the app is offline or the request 404s.
 *
 * `content` is wrapped in an opaque backing (found live: the row's own "glass" card is only
 * ~25% alpha by design, so the always-present green backgroundContent showed straight through
 * it even at rest — SwipeToDismissBox only ever moves the foreground aside, it never clips the
 * background to the current offset). A translucent row still looks right against the aurora
 * everywhere else; only inside a swipe container does it need something solid behind it first.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SwipeToCompleteRow(onComplete: suspend () -> Boolean, content: @Composable () -> Unit) {
    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { value -> value == SwipeToDismissBoxValue.StartToEnd },
    )
    LaunchedEffect(state.currentValue) {
        if (state.currentValue == SwipeToDismissBoxValue.StartToEnd) {
            val success = onComplete()
            if (!success) state.reset()
        }
    }

    // 0f at rest, 1f once dragged past ~120dp — used purely for the lift's visual ramp, not to
    // change when completion actually fires (that's still SwipeToDismissBox's own threshold).
    // requireOffset() can throw before the row's first layout pass — runCatching rather than
    // risk a crash on a value that's cosmetic, not functional.
    val thresholdPx = with(androidx.compose.ui.platform.LocalDensity.current) { 120.dp.toPx() }
    val liftFraction = min(1f, (runCatching { state.requireOffset() }.getOrDefault(0f)) / thresholdPx)

    SwipeToDismissBox(
        state = state,
        enableDismissFromEndToStart = false,
        backgroundContent = {
            Box(
                modifier = Modifier.fillMaxSize()
                    .background(Color(0xFF10B981), RoundedCornerShape(18.dp))
                    .padding(start = 20.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                Icon(Icons.Filled.Check, contentDescription = "Complete", tint = Color.White)
            }
        },
        content = {
            Box(
                modifier = Modifier
                    .graphicsLayer {
                        val scale = 1f + 0.03f * liftFraction
                        scaleX = scale
                        scaleY = scale
                        shadowElevation = 12f * liftFraction
                        shape = RoundedCornerShape(18.dp)
                        clip = false
                    }
                    .background(LifeosColors.background, RoundedCornerShape(18.dp)),
            ) {
                content()
            }
        },
    )
}

package com.spooky.lifeos.android.ui.motion

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import kotlinx.coroutines.delay

private const val STAGGER_STEP_MS = 40L
private const val MAX_STAGGER_MS = 400L // caps a long list's tail from feeling sluggish

/**
 * Fades + slides an item in on composition instead of it just appearing, with a delay derived
 * from its position in the list — "Feed arrival animations... staggered fade + vertical
 * movement rather than the whole feed rerendering." Re-plays each time a `LazyColumn` item
 * re-enters the composition window (e.g. scrolling back up to it) rather than only on the
 * list's true first-ever appearance — accepted as the simpler v1 rather than threading a
 * global "already animated" key set through every list; still delivers the actual ask (arrival
 * motion instead of an abrupt full rerender), just replays on re-entry too.
 */
@Composable
fun StaggeredEntrance(index: Int, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(minOf(index * STAGGER_STEP_MS, MAX_STAGGER_MS))
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(280)) + slideInVertically(initialOffsetY = { it / 5 }, animationSpec = tween(280)),
        modifier = modifier,
    ) {
        content()
    }
}

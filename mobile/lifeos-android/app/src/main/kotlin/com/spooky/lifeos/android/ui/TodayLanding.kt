package com.spooky.lifeos.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.ui.environment.EnvironmentalBackground

/**
 * Home's single full-bleed landing page — mountain/gradient art fills the entire first screen
 * (not a short banner above a separate flat-background list), with the greeting, weather chip,
 * Life Pulse, and Daily Rundown sentence all overlaid on top of it, and a "More" cue pinned at
 * the bottom that scrolls down to reveal the item cards below. Direct redesign feedback: the
 * mountain art should read as one immersive landing page, not a thin hero band.
 *
 * Caller sizes this with `Modifier.fillParentMaxHeight()` from inside the LazyColumn's item{}
 * scope (see MainActivity.kt's TodayScreen), so it fills exactly the visible viewport on first
 * load — scrolling past it is what reveals the rest of Home.
 */
@Composable
fun TodayLandingSection(
    greeting: String,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    weather: WeatherView?,
    onWeatherClick: () -> Unit,
    pulse: String,
    nowCount: Int,
    rundown: DailyRundown?,
    onSegmentClick: (RundownLink) -> Unit,
    onMoreClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize()) {
        EnvironmentalBackground(modifier = Modifier.fillMaxSize(), weather = weather)
        // Readability scrim — text now overlays the art across the *whole* screen, not just a
        // bottom band like the old short hero, so this darkens most of the frame rather than
        // just the lowest ~60%. Still lightest right at the top so the sky/mountain silhouette
        // stays visible, not just a flat dark rectangle with a picture peeking out beneath it.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.20f),
                            Color.Black.copy(alpha = 0.45f),
                            Color.Black.copy(alpha = 0.72f),
                        ),
                    ),
                ),
        )

        Column(modifier = Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                weather?.let {
                    WeatherChip(it, onClick = onWeatherClick)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                if (refreshing) {
                    CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp).size(20.dp), strokeWidth = 2.dp, color = LifeosColors.foreground)
                }
                IconButton(onClick = onRefresh, enabled = !refreshing) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Refresh", tint = LifeosColors.foreground)
                }
            }

            Text(
                greeting,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(top = 4.dp),
            )

            Spacer(modifier = Modifier.height(24.dp))
            PulseIndicator(pulse = pulse, nowCount = nowCount)

            Column(modifier = Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.Center) {
                rundown?.let { RundownSentenceText(rundown = it, onSegmentClick = onSegmentClick) }
            }

            if (onMoreClick != null) {
                MoreCta(onClick = onMoreClick, modifier = Modifier.align(Alignment.CenterHorizontally))
            }
        }
    }
}

/** A visibly tappable pill, not subtle text — this is the one explicit call-to-action on the
 *  landing page ("hit that bottom cta"), distinct from the rundown sentence's quiet inline tap
 *  targets, which are deliberately understated. */
@Composable
private fun MoreCta(onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(
        onClick = onClick,
        modifier = modifier
            .background(LifeosColors.glassSurface, RoundedCornerShape(20.dp))
            .padding(horizontal = 4.dp),
        colors = ButtonDefaults.textButtonColors(contentColor = LifeosColors.foreground),
    ) {
        Text("More", style = MaterialTheme.typography.labelLarge)
        Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, modifier = Modifier.padding(start = 2.dp).size(18.dp))
    }
}

package com.spooky.lifeos.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.MeasurementsClient
import com.spooky.lifeos.android.sync.SleepClient
import com.spooky.lifeos.android.sync.WhoopClient
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Ports components/health/whoop-card.tsx plus the trend charts, skin-temp baseline card, and
 * sleep log added alongside it — the "specifically the Whoop data tracking" ask followed by
 * "what else can we get from the strap." One scrollable column now instead of the earlier
 * grid-only layout, since there's more than one section to show.
 *
 * Wrapped in [SharedTransitionLayout] + [AnimatedContent] so a tapped [SleepLogCard] row can
 * shared-element-transform into [SleepSessionDetailScreen] rather than just revealing content
 * inline — the layout is scoped to this screen (not lifted to `AppShell`) since both the
 * collapsed row and the expanded detail live entirely within this composable's subtree; a
 * shared ancestor only needs to be as high as both endpoints actually require.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun HealthScreen() {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }

    var readings by remember { mutableStateOf<Map<String, WhoopReading>?>(null) }
    var heartRateTrend by remember { mutableStateOf<List<TrendPoint>?>(null) }
    var heartRateTrendError by remember { mutableStateOf<String?>(null) }
    var hrvTrend by remember { mutableStateOf<List<TrendPoint>?>(null) }
    var hrvTrendError by remember { mutableStateOf<String?>(null) }
    var skinTempBaseline by remember { mutableStateOf<SkinTempBaseline?>(null) }
    var skinTempError by remember { mutableStateOf<String?>(null) }
    var selectedSleepSession by remember { mutableStateOf<SleepSession?>(null) }
    var showLogWorkout by remember { mutableStateOf(false) }

    // Every branch below sets its own error state on failure rather than silently falling
    // back to an empty list — found live: a stale requireUserOrNull() on /api/measurements
    // (never swapped to accept the device token) made the trend charts show "No readings
    // yet" for months-old real data, indistinguishable from an honest empty state.
    LaunchedEffect(Unit) {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return@LaunchedEffect

        when (val result = WhoopClient(baseUrl, token).fetch()) {
            is ApiResult.Success -> readings = result.value
            is ApiResult.Failure -> android.util.Log.w("LifeosSync", "Whoop readings fetch failed: ${result.message}")
        }
        val measurementsClient = MeasurementsClient(baseUrl, token)
        when (val result = measurementsClient.trend("heart_rate")) {
            is ApiResult.Success -> heartRateTrend = lastMinutes(result.value, TREND_WINDOW_MINUTES)
            is ApiResult.Failure -> heartRateTrendError = result.message
        }
        when (val result = measurementsClient.trend("hrv")) {
            is ApiResult.Success -> hrvTrend = lastMinutes(result.value, TREND_WINDOW_MINUTES)
            is ApiResult.Failure -> hrvTrendError = result.message
        }
        when (val result = SleepClient(baseUrl, token).skinTempBaseline()) {
            is ApiResult.Success -> skinTempBaseline = result.value
            is ApiResult.Failure -> skinTempError = result.message
        }
    }

    if (showLogWorkout) {
        LogWorkoutScreen(onBack = { showLogWorkout = false }, onLogged = { showLogWorkout = false })
        return
    }

    SharedTransitionLayout {
        AnimatedContent(targetState = selectedSleepSession, label = "SleepSessionDetail") { session ->
            if (session == null) {
                HealthScreenBody(
                    readings = readings,
                    heartRateTrend = heartRateTrend,
                    heartRateTrendError = heartRateTrendError,
                    hrvTrend = hrvTrend,
                    hrvTrendError = hrvTrendError,
                    skinTempBaseline = skinTempBaseline,
                    skinTempError = skinTempError,
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                    onSelectSleepSession = { selectedSleepSession = it },
                    onLogWorkout = { showLogWorkout = true },
                )
            } else {
                BackHandler { selectedSleepSession = null }
                SleepSessionDetailScreen(
                    session = session,
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                    onBack = { selectedSleepSession = null },
                )
            }
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun HealthScreenBody(
    readings: Map<String, WhoopReading>?,
    heartRateTrend: List<TrendPoint>?,
    heartRateTrendError: String?,
    hrvTrend: List<TrendPoint>?,
    hrvTrendError: String?,
    skinTempBaseline: SkinTempBaseline?,
    skinTempError: String?,
    sharedTransitionScope: androidx.compose.animation.SharedTransitionScope,
    animatedVisibilityScope: androidx.compose.animation.AnimatedVisibilityScope,
    onSelectSleepSession: (SleepSession) -> Unit,
    onLogWorkout: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
            Text(
                "Health",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )
        }

        val entries = WHOOP_DISPLAY_ORDER.mapNotNull { type -> readings?.get(type)?.let { type to it } }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
        ) {
            // Deliberate narrative order, not the original fetch order: "right now" vitals
            // first (the NOW layer), then last night's sleep (the thing a morning check of
            // this screen is usually actually for), then the one truly actionable section
            // (logging a workout), then the more diagnostic trend/baseline context last,
            // since those are read-only background, not something to act on.
            item {
                if (readings == null) {
                    CircularProgressIndicator(color = LifeosColors.accent)
                } else if (entries.isEmpty()) {
                    Text(
                        "Not connected yet — pair the Whoop Bridge companion app with your strap to start syncing.",
                        color = LifeosColors.mutedFg,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    WhoopReadingsGrid(entries)
                }
            }

            item {
                SleepLogCard(
                    sharedTransitionScope = sharedTransitionScope,
                    animatedVisibilityScope = animatedVisibilityScope,
                    onSelectSession = onSelectSleepSession,
                )
            }

            item { SectionLabel("Workouts") }
            item {
                TrendCard {
                    Column {
                        Text(
                            "Log a walk, run, lift, or round of golf.",
                            color = LifeosColors.mutedFg,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 12.dp),
                        )
                        Button(
                            onClick = onLogWorkout,
                            colors = ButtonDefaults.buttonColors(containerColor = LifeosColors.accent, contentColor = LifeosColors.background),
                        ) {
                            Text("Log Workout")
                        }
                    }
                }
            }

            item { SectionLabel("Heart Rate (last 30 min)") }
            item {
                TrendCard {
                    if (heartRateTrendError != null) ErrorLine("Couldn't load — $heartRateTrendError")
                    else TrendLineChart(heartRateTrend ?: emptyList(), "bpm", emptyLabel = "No readings yet")
                }
            }

            item { SectionLabel("HRV (last 30 min)") }
            item {
                TrendCard {
                    if (hrvTrendError != null) ErrorLine("Couldn't load — $hrvTrendError")
                    else TrendLineChart(hrvTrend ?: emptyList(), "ms", emptyLabel = "No readings yet")
                }
            }

            item { SectionLabel("Skin Temp Baseline") }
            item {
                when {
                    skinTempError != null -> TrendCard { ErrorLine("Couldn't load — $skinTempError") }
                    skinTempBaseline != null -> SkinTempCard(skinTempBaseline!!)
                    else -> CircularProgressIndicator(color = LifeosColors.accent)
                }
            }
        }
    }
}

@Composable
private fun ErrorLine(message: String) {
    Text(message, color = LifeosColors.overdueFg, style = MaterialTheme.typography.bodySmall)
}

/** Delegates to the shared serif-styled `ui/components/SectionHeader` — same reasoning as the
 *  identical wrapper in `MainActivity.kt`'s Home screen: keep this file's existing call shape,
 *  adopt the shared title styling instead of a duplicate hand-rolled `Text`. */
@Composable
private fun SectionLabel(title: String) {
    com.spooky.lifeos.android.ui.components.SectionHeader(title = title)
}

@Composable
private fun TrendCard(content: @Composable () -> Unit) {
    com.spooky.lifeos.android.ui.components.LifeCard { content() }
}

@Composable
private fun WhoopReadingsGrid(entries: List<Pair<String, WhoopReading>>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        entries.chunked(2).forEach { rowEntries ->
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                rowEntries.forEach { (type, reading) ->
                    Box(modifier = Modifier.weight(1f)) { WhoopReadingCell(type, reading) }
                }
                if (rowEntries.size == 1) Box(modifier = Modifier.weight(1f)) {}
            }
        }
    }
}

@Composable
private fun WhoopReadingCell(type: String, reading: WhoopReading) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        // Was a hardcoded rose/pink (0xFB7185) left over from the old navy palette — noticed
        // during the earth-redesign Phase 1 device verification but not fixed until now.
        // Copper accent instead, matching every other vivid accent in this palette.
        Box(
            modifier = Modifier.size(36.dp).background(LifeosColors.accent.copy(alpha = 0.2f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Favorite, contentDescription = null, tint = LifeosColors.accent, modifier = Modifier.size(18.dp))
        }
        Column(modifier = Modifier.padding(start = 10.dp)) {
            com.spooky.lifeos.android.ui.motion.AnimatedNumber(
                value = reading.value.toDoubleOrNull() ?: 0.0,
                format = { "${formatWhoopValue(it)} ${reading.unit}" },
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = LifeosColors.foreground,
            )
            Text(WHOOP_LABELS[type] ?: type, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
            Text(relativeTime(reading.measuredAt), style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
        }
    }
}

private const val TREND_WINDOW_MINUTES = 30L

/**
 * Windows to the last N minutes of DATA WE HAVE, not wall-clock now — anchored on the latest
 * point's own timestamp rather than Instant.now(). Anchoring on "now" meant any gap since the
 * last successful derive/upload (BLE reconnect, Doze, phone out of range — all routine) made
 * the chart go blank even though the table had recent-ish readings sitting just outside the
 * window (found live: "not showing recent trending data" with real rows present). Anchoring on
 * the latest available point instead always shows the most recent slice we actually have.
 *
 * Windows client-side rather than plumbing a new minute-granularity range through
 * /api/measurements (which only offers day/month buckets — 30d/90d/6m/12m/all, see
 * MEASUREMENT_RANGES) — a quick, explicitly "for now" narrowing, not a real feature.
 */
private fun lastMinutes(points: List<TrendPoint>, minutes: Long): List<TrendPoint> {
    val latest = points.mapNotNull { p -> runCatching { Instant.parse(p.measuredAt) }.getOrNull() }.maxOrNull()
        ?: return emptyList()
    val cutoff = latest.minus(minutes, ChronoUnit.MINUTES)
    return points.filter { p -> runCatching { Instant.parse(p.measuredAt) }.getOrNull()?.isAfter(cutoff) == true }
}

/** Minimal formatDistanceToNow equivalent — "5m ago" / "3h ago" / "2d ago". */
private fun relativeTime(iso: String): String {
    val instant = runCatching { Instant.parse(iso) }.getOrNull() ?: return iso
    val minutes = ChronoUnit.MINUTES.between(instant, Instant.now())
    return when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        minutes < 60 * 24 -> "${minutes / 60}h ago"
        else -> "${minutes / (60 * 24)}d ago"
    }
}

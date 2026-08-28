package com.spooky.lifeos.android.ui

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.SleepClient
import com.spooky.lifeos.android.ui.motion.ProgressRing
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle as JavaTextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.max

private val STAGE_ORDER = mapOf("up" to 0, "wake" to 1, "still" to 2, "sleep" to 3)
private val STAGE_LABEL = mapOf("up" to "Up", "wake" to "Wake", "still" to "Still", "sleep" to "Sleep")
// "still" was a hardcoded sky blue (0x38BDF8) left over from the old navy palette — same
// leftover-hardcode bug as HealthScreen's heart icon and SkinTempCard's thermometer icon.
// Reuses SkinTempCard's sage-teal so there's exactly one "cool" tone across the Health tab,
// not a different blue per component.
private fun stageColor(stage: String): Color = when (stage) {
    "up" -> LifeosColors.mutedFg
    "wake" -> LifeosColors.dueSoonFg
    "still" -> Color(0xFF7C9A92)
    "sleep" -> LifeosColors.accent
    else -> LifeosColors.mutedFg
}

private fun formatDuration(seconds: Int?): String {
    if (seconds == null) return "In progress"
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return "${hours}h ${minutes}m"
}

/** "Last night" / "Two nights ago" / weekday / short date — a sleep session reads far more
 *  naturally against "how long ago" than a raw ISO date slice, same instinct as HealthScreen's
 *  `relativeTime` for Whoop readings. */
private fun formatSleepNight(startedAtIso: String): String {
    val instant = runCatching { Instant.parse(startedAtIso) }.getOrNull() ?: return startedAtIso
    val date = instant.atZone(ZoneId.systemDefault()).toLocalDate()
    val daysAgo = ChronoUnit.DAYS.between(date, LocalDate.now())
    return when (daysAgo) {
        0L -> "Tonight"
        1L -> "Last night"
        2L -> "Two nights ago"
        in 3..6 -> date.dayOfWeek.getDisplayName(JavaTextStyle.FULL, Locale.getDefault())
        else -> "${date.monthValue}/${date.dayOfMonth}"
    }
}

/**
 * Compact 7-bar canvas sparkline of recent nightly duration — the same "shape at a glance"
 * elevation as [TrendLineChart], scaled down for a header strip. The most recent night is
 * drawn at full accent opacity, older ones muted, so the eye lands on "how did I sleep most
 * recently" first.
 */
@Composable
private fun SleepDurationSparkline(sessions: List<SleepSession>) {
    val nights = sessions.take(7).reversed()
    val hours = nights.map { (it.durationSeconds ?: 0) / 3600f }
    if (hours.isEmpty()) return
    val maxHours = max(hours.max(), 1f)

    Canvas(modifier = Modifier.fillMaxWidth().height(48.dp)) {
        val barCount = hours.size
        val gap = 6.dp.toPx()
        val barWidth = (size.width - gap * (barCount - 1)) / barCount
        hours.forEachIndexed { i, h ->
            val barHeight = (h / maxHours * size.height).coerceAtLeast(4f)
            val x = i * (barWidth + gap)
            val isLast = i == hours.lastIndex
            drawRoundRect(
                color = if (isLast) LifeosColors.accent else LifeosColors.accent.copy(alpha = 0.32f),
                topLeft = Offset(x, size.height - barHeight),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(4.dp.toPx()),
            )
        }
    }
}

/**
 * Ports components/health/sleep-log.tsx — a list of sessions. Tapping a row no longer reveals
 * the hypnogram inline; it now navigates (via a shared-element transform driven by the caller's
 * `SharedTransitionScope`/`AnimatedVisibilityScope`) into [SleepSessionDetailScreen] — the row
 * itself visually grows into the full detail view instead of content just appearing beneath it.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun SleepLogCard(
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onSelectSession: (SleepSession) -> Unit,
) {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }

    var sessions by remember { mutableStateOf<List<SleepSession>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return@LaunchedEffect
        when (val result = SleepClient(baseUrl, token).listSessions()) {
            is ApiResult.Success -> sessions = result.value
            is ApiResult.Failure -> error = result.message
        }
    }

    com.spooky.lifeos.android.ui.components.LifeCard {
        Column {
            val loadedSessions = sessions
            val avgLabel = loadedSessions
                ?.mapNotNull { it.durationSeconds }
                ?.takeIf { it.isNotEmpty() }
                ?.let { durations -> "Avg " + formatDuration(durations.sum() / durations.size) + " over ${durations.size} nights" }

            Text("Sleep Log", style = MaterialTheme.typography.titleSmall, color = LifeosColors.foreground)
            avgLabel?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg, modifier = Modifier.padding(top = 2.dp))
            }

            when {
                error != null -> Text(
                    "Couldn't load — $error",
                    style = MaterialTheme.typography.bodySmall,
                    color = LifeosColors.overdueFg,
                    modifier = Modifier.padding(top = 8.dp),
                )
                loadedSessions == null -> CircularProgressIndicator(modifier = Modifier.padding(top = 12.dp), color = LifeosColors.accent)
                loadedSessions.isEmpty() -> Text(
                    "Not connected yet — pair the Whoop Bridge companion app to start syncing.",
                    style = MaterialTheme.typography.bodySmall,
                    color = LifeosColors.mutedFg,
                    modifier = Modifier.padding(top = 8.dp),
                )
                else -> {
                    SleepDurationSparkline(loadedSessions)
                    Column(modifier = Modifier.padding(top = 10.dp)) {
                        loadedSessions.forEachIndexed { index, session ->
                            com.spooky.lifeos.android.ui.motion.StaggeredEntrance(index = index) {
                                with(sharedTransitionScope) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth()
                                            .sharedBounds(
                                                rememberSharedContentState(key = "sleep-session-${session.id}"),
                                                animatedVisibilityScope = animatedVisibilityScope,
                                            )
                                            .clickable { onSelectSession(session) }
                                            .padding(vertical = 7.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                modifier = Modifier.size(30.dp).background(LifeosColors.accent.copy(alpha = 0.2f), CircleShape),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.Filled.Bedtime, contentDescription = null, tint = LifeosColors.accent, modifier = Modifier.size(15.dp))
                                            }
                                            Text(
                                                formatSleepNight(session.startedAt),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = LifeosColors.foreground,
                                                modifier = Modifier.padding(start = 10.dp),
                                            )
                                        }
                                        Text(
                                            formatDuration(session.durationSeconds),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = LifeosColors.foreground,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Compose Canvas step chart — native counterpart to components/health/sleep-hypnogram.tsx.
 * `onSegmentsLoaded` lets a caller (namely [SleepSessionDetailScreen]) piggyback on this
 * component's own fetch to compute a derived metric (time-asleep %) without a second,
 * duplicate `/sessions/{id}/segments` request.
 */
@Composable
fun SleepHypnogram(sessionId: String, onSegmentsLoaded: (List<SleepStageSegment>) -> Unit = {}) {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    var segments by remember(sessionId) { mutableStateOf<List<SleepStageSegment>?>(null) }
    var error by remember(sessionId) { mutableStateOf<String?>(null) }

    LaunchedEffect(sessionId) {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return@LaunchedEffect
        when (val result = SleepClient(baseUrl, token).sessionSegments(sessionId)) {
            is ApiResult.Success -> {
                segments = result.value
                onSegmentsLoaded(result.value)
            }
            is ApiResult.Failure -> error = result.message
        }
    }

    if (error != null) {
        Text("Couldn't load — $error", style = MaterialTheme.typography.bodySmall, color = LifeosColors.overdueFg)
        return
    }
    val segs = segments
    if (segs == null) {
        CircularProgressIndicator(modifier = Modifier.padding(8.dp), color = LifeosColors.accent)
        return
    }
    if (segs.isEmpty()) {
        Text("No stage detail recorded for this session.", style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
        return
    }

    val startMs = runCatching { Instant.parse(segs.first().startedAt).toEpochMilli() }.getOrDefault(0L)
    val endMs = runCatching { Instant.parse(segs.last().endedAt).toEpochMilli() }.getOrDefault(1L)
    val timeSpread = (endMs - startMs).coerceAtLeast(1L).toFloat()

    Canvas(modifier = Modifier.fillMaxWidth().height(90.dp).padding(vertical = 8.dp)) {
        val w = size.width
        val rowHeight = size.height / 4f

        fun xFor(iso: String) = ((runCatching { Instant.parse(iso).toEpochMilli() }.getOrDefault(startMs) - startMs) / timeSpread * w)
        fun yFor(stage: String) = (STAGE_ORDER[stage] ?: 1) * rowHeight + rowHeight / 2f

        for (i in segs.indices) {
            val seg = segs[i]
            val x1 = xFor(seg.startedAt)
            val x2 = xFor(seg.endedAt)
            val y = yFor(seg.stage)
            drawLine(color = stageColor(seg.stage), start = Offset(x1, y), end = Offset(x2, y), strokeWidth = 8f, cap = androidx.compose.ui.graphics.StrokeCap.Round)
            val next = segs.getOrNull(i + 1)
            if (next != null) {
                val nextY = yFor(next.stage)
                drawLine(color = stageColor(seg.stage), start = Offset(x2, y), end = Offset(x2, nextY), strokeWidth = 2f)
            }
        }
    }
}

/**
 * Full-screen destination a [SleepLogCard] row shared-element-transforms into. Hero content is
 * the time-asleep [ProgressRing] deferred from Phase C (no concrete detail surface existed to
 * host it on until now) plus the same [SleepHypnogram] that used to render inline — same data,
 * a real screen instead of an expanding accordion row.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun SleepSessionDetailScreen(
    session: SleepSession,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
) {
    var loadedSegments by remember(session.id) { mutableStateOf<List<SleepStageSegment>?>(null) }

    // Time-asleep fraction of the session, derived from the segments SleepHypnogram fetches
    // for itself below — see its onSegmentsLoaded doc comment for why this avoids a second
    // network round-trip rather than fetching independently here.
    val asleepFraction = remember(loadedSegments, session.durationSeconds) {
        val segs = loadedSegments
        val totalSeconds = session.durationSeconds
        if (segs.isNullOrEmpty() || totalSeconds == null || totalSeconds <= 0) return@remember null
        val asleepSeconds = segs.filter { it.stage == "sleep" }.sumOf { seg ->
            val start = runCatching { Instant.parse(seg.startedAt).epochSecond }.getOrDefault(0L)
            val end = runCatching { Instant.parse(seg.endedAt).epochSecond }.getOrDefault(0L)
            (end - start).coerceAtLeast(0L)
        }
        (asleepSeconds.toFloat() / totalSeconds.toFloat()).coerceIn(0f, 1f)
    }

    with(sharedTransitionScope) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .sharedBounds(
                    rememberSharedContentState(key = "sleep-session-${session.id}"),
                    animatedVisibilityScope = animatedVisibilityScope,
                )
                .background(LifeosColors.background)
                .statusBarsPadding()
                .padding(horizontal = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
                }
                Text(
                    runCatching { Instant.parse(session.startedAt).toString().take(10) }.getOrDefault(session.startedAt),
                    style = MaterialTheme.typography.titleMedium,
                    color = LifeosColors.foreground,
                    modifier = Modifier.padding(start = 4.dp),
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                ProgressRing(
                    progress = asleepFraction ?: 0f,
                    diameter = 140.dp,
                    strokeWidth = 10.dp,
                    trackColor = LifeosColors.glassBorder,
                    progressColor = LifeosColors.accent,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            formatDuration(session.durationSeconds),
                            style = MaterialTheme.typography.titleLarge,
                            color = LifeosColors.foreground,
                        )
                        Text("asleep", style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text("Sleep Stages", style = MaterialTheme.typography.labelLarge, color = LifeosColors.mutedFg)
            SleepHypnogram(sessionId = session.id, onSegmentsLoaded = { loadedSegments = it })
        }
    }
}

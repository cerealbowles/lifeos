package com.spooky.lifeos.android.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.LocalFlorist
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Domain icon set — mirrors lucide-react's mapping in components/dashboard/domain-icon.tsx. */
private fun domainIcon(domain: String): ImageVector = when (domain) {
    "task" -> Icons.Filled.CheckBox
    "routine" -> Icons.Filled.Autorenew
    "pet" -> Icons.Filled.Pets
    "financial" -> Icons.Filled.AccountBalanceWallet
    "calendar" -> Icons.Filled.CalendarMonth
    "sports" -> Icons.Filled.EmojiEvents
    "grow" -> Icons.Filled.LocalFlorist
    else -> Icons.Filled.CheckBox
}

/**
 * Icon-in-a-colored-circle, one per domain — ports domain-icon.tsx's DomainAvatar exactly,
 * including its central design rule: `vivid = true` (full per-domain color) is reserved for
 * NOW, where something has actually earned prominence; `vivid = false` uses one shared muted
 * neutral treatment for TODAY, so visual weight tracks relevance instead of every section
 * being equally loud all the time (DECISIONS.md ADR-029/041, cited directly in the original).
 */
@Composable
fun DomainAvatar(domain: String, vivid: Boolean, modifier: Modifier = Modifier) {
    val (bg, fg) = if (vivid) domainColor(domain) else DomainColor(LifeosColors.mutedBg, LifeosColors.mutedFg)
    Box(
        modifier = modifier.size(36.dp).background(bg, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(domainIcon(domain), contentDescription = domainLabel(domain), tint = fg, modifier = Modifier.size(18.dp))
    }
}

/**
 * Short colored due-status pill — ports due-badge.tsx's overdue/due_soon wording + colors,
 * including its ADR-107 `isSports` branch: a game has a kickoff time, not an obligation, so
 * "Due"/"overdue" (which implies something owed) is swapped for plain "Today"/"Tomorrow"/
 * "In Xd"/"Xd ago" wording when `domain == "sports"`. Found live: "COL @ WSH — Due today"
 * read as if the user owed something on the game, not that it was starting today.
 */
@Composable
fun DueBadge(dueStatus: String?, daysDelta: Int?, live: Boolean, domain: String? = null) {
    val isSports = domain == "sports"
    val (text, bg, fg) = when {
        live -> Triple("LIVE", LifeosColors.overdueBg, LifeosColors.overdueFg)
        dueStatus == "overdue" && daysDelta != null -> {
            val label = if (isSports) {
                if (daysDelta == 0) "Today" else "${daysDelta}d ago"
            } else {
                if (daysDelta == 0) "Due today" else "${daysDelta}d overdue"
            }
            Triple(label, LifeosColors.overdueBg, LifeosColors.overdueFg)
        }
        dueStatus == "due_soon" && daysDelta != null -> {
            val days = -daysDelta
            val label = if (isSports) {
                when (days) {
                    0 -> "Today"
                    1 -> "Tomorrow"
                    else -> "In ${days}d"
                }
            } else {
                when (days) {
                    0 -> "Due today"
                    1 -> "Due tomorrow"
                    else -> "Due in ${days}d"
                }
            }
            Triple(label, LifeosColors.dueSoonBg, LifeosColors.dueSoonFg)
        }
        else -> return
    }
    Box(
        modifier = Modifier.background(bg, RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(text, color = fg, fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
    }
}

/**
 * One NOW/TODAY row — domain avatar + title/subtitle + due badge, same layout as the web
 * app's row, rendered on the shared [com.spooky.lifeos.android.ui.components.LifeCard]
 * "frosted glass" panel treatment (translucent fill + faint light border, no shadow).
 */
@Composable
fun TodayItemRow(item: TodayItem, vividAvatar: Boolean) {
    com.spooky.lifeos.android.ui.components.LifeCard(modifier = Modifier, contentPadding = 0.dp) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            DomainAvatar(item.domain, vivid = vividAvatar)
            Column(modifier = Modifier.weight(1f)) {
                Text(item.title, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground)
                item.subtitle?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
                }
            }
            DueBadge(item.dueStatus, item.daysDelta, item.live, domain = item.domain)
        }
    }
}

/**
 * Life Pulse — the one persistent colored-dot readout of the day's overall attention state,
 * ported from life-pulse.tsx.
 *
 * The dot now breathes (scale + alpha loop) specifically when `pulse` is `"attention"` or
 * `"urgent"` — a scoped, explicit override of the original's "no decorative looping" principle
 * (confirmed with the user for the native app specifically; see `ui/motion/MotionSpecs.kt`'s
 * doc comment), reasoned as arguably justified rather than pure decoration: the motion
 * correlates with a state that genuinely needs the user's attention. `"calm"` and `"active"`
 * stay static — looping motion on a "nothing's wrong" state would undercut the calm-computing
 * intent even under the override, so this isn't a blanket "make it move" pass.
 */
@Composable
fun PulseIndicator(pulse: String, nowCount: Int) {
    val color = when (pulse) {
        "urgent" -> LifeosColors.pulseUrgent
        "attention" -> LifeosColors.pulseAttention
        "active" -> LifeosColors.pulseActive
        else -> LifeosColors.pulseCalm
    }
    val label = when (pulse) {
        "calm" -> "Nothing needs you."
        "active" -> "Nothing urgent — a few things on deck."
        "attention" -> "$nowCount thing${if (nowCount == 1) "" else "s"} need${if (nowCount == 1) "s" else ""} your attention."
        "urgent" -> "$nowCount overdue."
        else -> ""
    }
    val needsAttention = pulse == "attention" || pulse == "urgent"

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (needsAttention) {
            BreathingPulseDot(color = color)
        } else {
            Box(modifier = Modifier.size(12.dp).background(color, CircleShape))
        }
        Text(label, style = MaterialTheme.typography.bodyLarge, color = LifeosColors.foreground)
    }
}

/**
 * The dot's loop is intentionally its own short (~1.4s) cycle, not `Motion.AMBIENT_CYCLE_MS`
 * (24s, tuned for the barely-perceptible aurora drift) — this needs to read as "alive" at a
 * glance, closer to a recording indicator than a slow ambient texture. Only ever composed for
 * `"attention"`/`"urgent"` (see [PulseIndicator]), so no animation frames are scheduled at all
 * for the calm/static states.
 */
@Composable
private fun BreathingPulseDot(color: Color) {
    val transition = rememberInfiniteTransition(label = "PulseBreath")
    val scale by transition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "PulseScale",
    )
    val dotAlpha by transition.animateFloat(
        initialValue = 0.65f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "PulseAlpha",
    )
    Box(
        modifier = Modifier
            .size(12.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = dotAlpha
            }
            .background(color, CircleShape),
    )
}

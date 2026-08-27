package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.TodayActionsClient

/**
 * Which domains open a detail sheet when a Home row is tapped, instead of doing nothing (rows
 * have no tap target otherwise — see TodayItemRow's `onClick` doc comment). Grow (quick
 * check-in) and sports (score/odds) are the two domains with real detail worth surfacing;
 * mirrors the web app's item-detail-sheet.tsx `itemOpensSheet` split exactly.
 */
fun itemOpensSheet(item: TodayItem): Boolean = item.domain == "grow" || (item.domain == "sports" && item.game != null)

/**
 * Home's tap-to-detail overlay (direct user request, 2026-08-27: "click on a card... bring up
 * a new screen... close it back down"). A `ModalBottomSheet` rather than a full navigation
 * destination — this is meant to read as "one tap away" (DECISIONS.md ADR-124 on the web side),
 * not a new screen in the back stack.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemDetailSheet(
    item: TodayItem?,
    baseUrl: String?,
    token: String?,
    onDismiss: () -> Unit,
    onCheckedIn: () -> Unit,
) {
    if (item == null) return
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = LifeosColors.background,
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = LifeosColors.foreground)
            item.subtitle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg, modifier = Modifier.padding(top = 2.dp))
            }
            Spacer(modifier = Modifier.height(16.dp))

            when {
                item.domain == "grow" -> GrowCheckInForm(item = item, baseUrl = baseUrl, token = token, onCheckedIn = onCheckedIn)
                item.domain == "sports" && item.game != null -> GameDetailContent(item.game)
            }
        }
    }
}

/**
 * Quick check-in — stage/trichome/notes, all optional and independently toggleable (tap a chip
 * again to clear it), mirroring the server's checkInSchema where every field is optional: a
 * field the user never touched here is left alone server-side, not overwritten. Deliberately
 * doesn't prefetch the plant's current stage/last-checked time first (unlike the web sheet's
 * fuller form) — the item's own title already carries the day count, and a second network round
 * trip just to preselect a chip isn't worth the latency for what's meant to be a quick action;
 * Browse's Grow detail screen (BrowseDetailScreens.kt) remains the full editor for that.
 */
@Composable
private fun GrowCheckInForm(item: TodayItem, baseUrl: String?, token: String?, onCheckedIn: () -> Unit) {
    var stage by remember(item.id) { mutableStateOf<String?>(null) }
    var trichome by remember(item.id) { mutableStateOf<String?>(null) }
    var notes by remember(item.id) { mutableStateOf("") }

    Text("Stage (optional)", style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg, modifier = Modifier.padding(bottom = 6.dp))
    ChipRow(
        listOf("seedling" to "Seedling", "veg" to "Veg", "flower" to "Flower", "flush" to "Flush", "harvest" to "Harvest"),
        stage ?: "",
    ) { stage = if (stage == it) null else it }

    Text("Trichomes (optional)", style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg, modifier = Modifier.padding(bottom = 6.dp))
    ChipRow(listOf("clear" to "Clear", "cloudy" to "Cloudy", "amber" to "Amber"), trichome ?: "") {
        trichome = if (trichome == it) null else it
    }

    FormField("Notes (optional)", notes, { notes = it }, singleLine = false)
    Spacer(modifier = Modifier.height(12.dp))

    ActionButton(
        label = "Check in",
        color = LifeosColors.accent,
        onClick = {
            if (baseUrl == null || token == null) {
                ApiResult.Failure("Not signed in")
            } else {
                TodayActionsClient(baseUrl, token).checkInPlant(item.id, stage, trichome, notes.trim().ifBlank { null })
            }
        },
        onSuccess = onCheckedIn,
    )
}

/**
 * Score/status/odds for a favorite-team game — ports components/sports/game-card.tsx's header
 * (same fields, same moneyline formatting), minus the boxscore stats table (no native equivalent
 * of BoxscorePanel.tsx yet; the score/odds view alone already answers "what's the game doing
 * right now," which is what a Home tap is for).
 */
@Composable
private fun GameDetailContent(game: GameInfo) {
    val isLive = game.status == "Live"
    val isFinal = game.status == "Final"

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${game.awayTeam} @ ${game.homeTeam}",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            color = LifeosColors.foreground,
        )
        val (badgeText, badgeColor) = when {
            isLive -> "LIVE" to LifeosColors.overdueFg
            isFinal -> "FINAL" to LifeosColors.mutedFg
            else -> "SCHEDULED" to LifeosColors.mutedFg
        }
        Text(badgeText, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium, color = badgeColor)
    }

    if (isLive || isFinal) {
        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(32.dp)) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text((game.awayScore ?: "—").toString(), style = MaterialTheme.typography.headlineSmall, color = LifeosColors.foreground)
                Text(game.awayTeam, style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text((game.homeScore ?: "—").toString(), style = MaterialTheme.typography.headlineSmall, color = LifeosColors.foreground)
                Text(game.homeTeam, style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg)
            }
            if (isLive) {
                game.period?.let {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(it, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, color = LifeosColors.dueSoonFg)
                    }
                }
            }
        }
    }

    game.odds?.let { odds ->
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            "ML ${game.awayTeam} ${formatMoneyline(odds.awayMoneyline)} · ${game.homeTeam} ${formatMoneyline(odds.homeMoneyline)}",
            style = MaterialTheme.typography.bodySmall,
            color = LifeosColors.mutedFg,
        )
        odds.totalLine?.let {
            Text(
                "O/U $it (${formatMoneyline(odds.overOdds)}/${formatMoneyline(odds.underOdds)})",
                style = MaterialTheme.typography.bodySmall,
                color = LifeosColors.mutedFg,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }

    if (!isLive && !isFinal && game.odds == null) {
        Spacer(modifier = Modifier.height(8.dp))
        Text("No odds yet — check back closer to kickoff.", style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
    }
}

private fun formatMoneyline(value: Int?): String {
    if (value == null) return "—"
    return if (value > 0) "+$value" else "$value"
}

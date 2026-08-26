package com.spooky.lifeos.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.BrowseClient

/**
 * The tap-through destination TODAY items point at on the web (domainMeta(domain).href) —
 * here, a single screen with a domain switcher up top rather than six separate nav
 * destinations, since there's no space for a second-level nav bar on mobile.
 *
 * Wrapped in [SharedTransitionLayout] + [AnimatedContent] so a tapped row shared-element-
 * transforms into a full per-domain detail screen (BrowseDetailScreens.kt) — same pattern
 * proven out on the Sleep Log (HealthScreen.kt), now extended to every Browse domain.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun BrowseScreen() {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }

    var domain by remember { mutableStateOf(BrowseDomain.PET) }
    var rows by remember { mutableStateOf<List<BrowseRow>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    // Bumped after a detail-screen action succeeds (retire, complete, delete, ...) so the list
    // reflects it on return, without needing each action to hand back an updated row itself.
    var refreshKey by remember { mutableStateOf(0) }
    var selectedRow by remember { mutableStateOf<BrowseRow?>(null) }
    // Direct user request, 2026-08-26: "I need functionality" to add records, not just browse.
    // A separate flag rather than folding into `selectedRow` — creating isn't "viewing a row
    // that doesn't exist yet," it's a distinct mode with its own screen (BrowseCreateScreens.kt).
    var showCreate by remember { mutableStateOf(false) }

    LaunchedEffect(domain, refreshKey) {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return@LaunchedEffect
        loading = true
        error = null
        when (val result = BrowseClient(baseUrl, token).list(domain)) {
            is ApiResult.Success -> rows = result.value
            is ApiResult.Failure -> error = result.message
        }
        loading = false
    }

    if (showCreate) {
        BackHandler { showCreate = false }
        BrowseCreateHost(domain = domain, onBack = { showCreate = false }, onCreated = { refreshKey++ })
        return
    }

    SharedTransitionLayout {
        AnimatedContent(targetState = selectedRow, label = "BrowseDetailTransition") { row ->
            if (row == null) {
                BrowseListBody(
                    domain = domain,
                    onSelectDomain = { domain = it },
                    rows = rows,
                    error = error,
                    loading = loading,
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                    onSelectRow = { selectedRow = it },
                    onAddClick = { showCreate = true },
                )
            } else {
                BackHandler { selectedRow = null }
                BrowseDetailHost(
                    domain = domain,
                    row = row,
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedVisibilityScope = this,
                    onBack = { selectedRow = null },
                    onActionComplete = { refreshKey++ },
                )
            }
        }
    }
}

/** Sports is read-only external data — no create screen for it, `BrowseListBody` already omits
 *  its FAB so this is never reached for that domain in practice. */
@Composable
private fun BrowseCreateHost(domain: BrowseDomain, onBack: () -> Unit, onCreated: () -> Unit) {
    when (domain) {
        BrowseDomain.PET -> NewPetScreen(onBack, onCreated)
        BrowseDomain.GROW -> NewPlantScreen(onBack, onCreated)
        BrowseDomain.FINANCIAL -> NewReminderScreen(onBack, onCreated)
        BrowseDomain.ROUTINE -> NewRoutineScreen(onBack, onCreated)
        BrowseDomain.CALENDAR -> NewEventScreen(onBack, onCreated)
        BrowseDomain.SPORTS -> Unit
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun BrowseListBody(
    domain: BrowseDomain,
    onSelectDomain: (BrowseDomain) -> Unit,
    rows: List<BrowseRow>?,
    error: String?,
    loading: Boolean,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onSelectRow: (BrowseRow) -> Unit,
    onAddClick: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                Text(
                    "Browse",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = LifeosColors.foreground,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                LazyRow(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                ) {
                    items(BrowseDomain.entries) { entry ->
                        FilterChip(
                            selected = domain == entry,
                            onClick = { onSelectDomain(entry) },
                            label = { Text(entry.label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = LifeosColors.accent,
                                selectedLabelColor = LifeosColors.background,
                                containerColor = LifeosColors.glassSurface,
                                labelColor = LifeosColors.mutedFg,
                            ),
                        )
                    }
                }
            }
        }

        when {
            loading && rows == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LifeosColors.accent)
            }
            error != null && rows == null -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("Couldn't load ${domain.label} — $error", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
            rows?.isEmpty() == true -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text(emptyStateCopy(domain), color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 16.dp),
            ) {
                itemsIndexed(rows.orEmpty(), key = { _, it -> it.id }) { index, row ->
                    com.spooky.lifeos.android.ui.motion.StaggeredEntrance(index = index) {
                        with(sharedTransitionScope) {
                            com.spooky.lifeos.android.ui.components.LifeCard(
                                onClick = { onSelectRow(row) },
                                modifier = Modifier.fillMaxWidth().sharedBounds(
                                    rememberSharedContentState(key = browseSharedKey(domain, row.id)),
                                    animatedVisibilityScope = animatedVisibilityScope,
                                ),
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    BrowseRowIcon(domain)
                                    Column {
                                        Text(
                                            row.title,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = if (row.inactive) LifeosColors.mutedFg else LifeosColors.foreground,
                                        )
                                        if (row.subtitle.isNotBlank()) {
                                            Text(row.subtitle, style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
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

    // No add flow for Sports — read-only external odds/schedule data, nothing to create.
    if (domain != BrowseDomain.SPORTS) {
        FloatingActionButton(
            onClick = onAddClick,
            containerColor = LifeosColors.accent,
            contentColor = LifeosColors.background,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Add ${domain.label.removeSuffix("s")}")
        }
    }
    }
}

/** Small colored circular avatar per domain — same `domainColor`/Material-icon pairing as
 *  Today's vivid NOW avatars (Theme.kt's `domainColor`), just not the exact same composable
 *  since Browse's row shape is simpler (no due badge/chevron). */
@Composable
private fun BrowseRowIcon(domain: BrowseDomain) {
    val tone = domainColor(domain.toRankingDomain())
    val icon = when (domain) {
        BrowseDomain.PET -> Icons.Filled.Pets
        BrowseDomain.GROW -> Icons.Filled.Eco
        BrowseDomain.FINANCIAL -> Icons.Filled.AttachMoney
        BrowseDomain.ROUTINE -> Icons.Filled.Repeat
        BrowseDomain.CALENDAR -> Icons.Filled.CalendarMonth
        BrowseDomain.SPORTS -> Icons.Filled.EmojiEvents
    }
    Box(
        modifier = Modifier.size(36.dp).background(tone.bg, androidx.compose.foundation.shape.CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tone.fg, modifier = Modifier.size(18.dp))
    }
}

private fun emptyStateCopy(domain: BrowseDomain): String = when (domain) {
    BrowseDomain.PET -> "No pets yet — tap + to add one."
    BrowseDomain.GROW -> "No plants yet — tap + to add one."
    BrowseDomain.FINANCIAL -> "No reminders yet — tap + to add one."
    BrowseDomain.ROUTINE -> "No routines yet — tap + to add one."
    BrowseDomain.CALENDAR -> "No events yet — tap + to add one."
    BrowseDomain.SPORTS -> "Nothing here yet."
}

/** `domainColor` (Theme.kt) is keyed by the ranking-engine's `CandidateDomain` string values
 *  ("task"/"routine"/"pet"/"financial"/"calendar"/"sports"/"grow") — this maps Browse's own
 *  `BrowseDomain` enum onto those same keys rather than duplicating a second color table. */
private fun BrowseDomain.toRankingDomain(): String = when (this) {
    BrowseDomain.PET -> "pet"
    BrowseDomain.GROW -> "grow"
    BrowseDomain.FINANCIAL -> "financial"
    BrowseDomain.ROUTINE -> "routine"
    BrowseDomain.CALENDAR -> "calendar"
    BrowseDomain.SPORTS -> "sports"
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun BrowseDetailHost(
    domain: BrowseDomain,
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    when (domain) {
        BrowseDomain.PET -> PetDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.GROW -> PlantDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.FINANCIAL -> MoneyDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.ROUTINE -> RoutineDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.CALENDAR -> CalendarDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.SPORTS -> SportsDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
    }
}

package com.spooky.lifeos.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RssFeed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.BrowseClient

/**
 * The tap-through destination TODAY items point at on the web (domainMeta(domain).href) —
 * here, a single screen. Lands on a launcher-style grid of all six domains (`domain == null`)
 * rather than defaulting into one of them, since there's no space for a second-level nav bar
 * on mobile and a grid reads more like "browse everything" than an arbitrary starting tab.
 * Picking a tile fades the grid out and fades the domain's list in.
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

    var domain by remember { mutableStateOf<BrowseDomain?>(null) }
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
    // Sports' FAB opens this instead of a create form (games are read-only external data) —
    // see FavoriteTeamsScreen.kt.
    var showFavoriteTeams by remember { mutableStateOf(false) }

    LaunchedEffect(domain, refreshKey) {
        val d = domain ?: return@LaunchedEffect
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return@LaunchedEffect
        loading = true
        error = null
        rows = null
        when (val result = BrowseClient(baseUrl, token).list(d)) {
            is ApiResult.Success -> rows = result.value
            is ApiResult.Failure -> error = result.message
        }
        loading = false
    }

    if (showCreate) {
        // Only reachable via the list body's FAB, which only renders once a domain is picked.
        val activeDomain = domain ?: return
        BackHandler { showCreate = false }
        BrowseCreateHost(domain = activeDomain, onBack = { showCreate = false }, onCreated = { refreshKey++ })
        return
    }

    if (showFavoriteTeams) {
        BackHandler { showFavoriteTeams = false }
        FavoriteTeamsScreen(onBack = { showFavoriteTeams = false })
        return
    }

    SharedTransitionLayout {
        AnimatedContent(
            targetState = domain,
            label = "BrowseDomainTransition",
            transitionSpec = { fadeIn() togetherWith fadeOut() },
        ) { targetDomain ->
            if (targetDomain == null) {
                BrowseDomainGrid(onSelectDomain = { domain = it })
            } else {
                AnimatedContent(targetState = selectedRow, label = "BrowseDetailTransition") { row ->
                    if (row == null) {
                        BackHandler { domain = null }
                        BrowseListBody(
                            domain = targetDomain,
                            onBack = { domain = null },
                            rows = rows,
                            error = error,
                            loading = loading,
                            sharedTransitionScope = this@SharedTransitionLayout,
                            animatedVisibilityScope = this,
                            onSelectRow = { selectedRow = it },
                            onAddClick = { showCreate = true },
                            onManageTeams = { showFavoriteTeams = true },
                        )
                    } else {
                        BackHandler { selectedRow = null }
                        BrowseDetailHost(
                            domain = targetDomain,
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
    }
}

/** Landing page: every Browse domain as an icon tile in a grid, matching the "buttons in the
 *  top row" the domain switcher used to be — now the whole first screen instead of a strip of
 *  chips, since there's room to make each domain a full tappable target. */
@Composable
private fun BrowseDomainGrid(onSelectDomain: (BrowseDomain) -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            "Browse",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = LifeosColors.foreground,
            modifier = Modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(BrowseDomain.entries, key = { it.name }) { entry ->
                BrowseDomainTile(entry, onClick = { onSelectDomain(entry) })
            }
        }
    }
}

@Composable
private fun BrowseDomainTile(domain: BrowseDomain, onClick: () -> Unit) {
    val tone = domainColor(domain.toRankingDomain())
    com.spooky.lifeos.android.ui.components.LifeCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().aspectRatio(1f),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier = Modifier.size(48.dp).background(tone.bg, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(browseDomainIcon(domain), contentDescription = null, tint = tone.fg, modifier = Modifier.size(24.dp))
            }
            Text(
                domain.label,
                style = MaterialTheme.typography.bodyMedium,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(top = 8.dp),
            )
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
        BrowseDomain.NOTES -> NewNoteScreen(onBack, onCreated)
        BrowseDomain.LISTS -> NewListScreen(onBack, onCreated)
        BrowseDomain.MOMENTS -> NewMomentScreen(onBack, onCreated)
        BrowseDomain.CHALLENGES -> NewChallengeScreen(onBack, onCreated)
        BrowseDomain.ACCOUNTS -> NewAccountScreen(onBack, onCreated)
        BrowseDomain.FEED -> NewFeedScreen(onBack, onCreated)
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun BrowseListBody(
    domain: BrowseDomain,
    onBack: () -> Unit,
    rows: List<BrowseRow>?,
    error: String?,
    loading: Boolean,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onSelectRow: (BrowseRow) -> Unit,
    onAddClick: () -> Unit,
    onManageTeams: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to Browse", tint = LifeosColors.foreground)
            }
            Text(
                domain.label,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = LifeosColors.foreground,
                modifier = Modifier.padding(start = 4.dp),
            )
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

    // No create flow for Sports — read-only external odds/schedule data, nothing to create.
    // Its FAB opens the favorite-teams follow/unfollow list instead (FavoriteTeamsScreen.kt).
    if (domain != BrowseDomain.SPORTS) {
        FloatingActionButton(
            onClick = onAddClick,
            containerColor = LifeosColors.accent,
            contentColor = LifeosColors.background,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Add ${domain.label.removeSuffix("s")}")
        }
    } else {
        FloatingActionButton(
            onClick = onManageTeams,
            containerColor = LifeosColors.accent,
            contentColor = LifeosColors.background,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) {
            Icon(Icons.Filled.Star, contentDescription = "Favorite Teams")
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
    Box(
        modifier = Modifier.size(36.dp).background(tone.bg, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(browseDomainIcon(domain), contentDescription = null, tint = tone.fg, modifier = Modifier.size(18.dp))
    }
}

/** Same icon mapping shared by the landing grid's tiles and each list row's avatar. */
private fun browseDomainIcon(domain: BrowseDomain): ImageVector = when (domain) {
    BrowseDomain.PET -> Icons.Filled.Pets
    BrowseDomain.GROW -> Icons.Filled.Eco
    BrowseDomain.FINANCIAL -> Icons.Filled.AttachMoney
    BrowseDomain.ROUTINE -> Icons.Filled.Repeat
    BrowseDomain.CALENDAR -> Icons.Filled.CalendarMonth
    BrowseDomain.SPORTS -> Icons.Filled.EmojiEvents
    BrowseDomain.NOTES -> Icons.AutoMirrored.Filled.Notes
    BrowseDomain.LISTS -> Icons.Filled.Checklist
    BrowseDomain.MOMENTS -> Icons.Filled.PhotoCamera
    BrowseDomain.CHALLENGES -> Icons.Filled.EmojiEvents
    BrowseDomain.ACCOUNTS -> Icons.Filled.AccountBalance
    BrowseDomain.FEED -> Icons.Filled.RssFeed
}

private fun emptyStateCopy(domain: BrowseDomain): String = when (domain) {
    BrowseDomain.PET -> "No pets yet — tap + to add one."
    BrowseDomain.GROW -> "No plants yet — tap + to add one."
    BrowseDomain.FINANCIAL -> "No reminders yet — tap + to add one."
    BrowseDomain.ROUTINE -> "No routines yet — tap + to add one."
    BrowseDomain.CALENDAR -> "No events yet — tap + to add one."
    BrowseDomain.SPORTS -> "Nothing here yet."
    BrowseDomain.NOTES -> "No notes yet — tap + to add one."
    BrowseDomain.LISTS -> "No lists yet — tap + to add one."
    BrowseDomain.MOMENTS -> "No moments yet — tap + to add one."
    BrowseDomain.CHALLENGES -> "No challenges yet — tap + to add one."
    BrowseDomain.ACCOUNTS -> "No accounts yet — tap + to add one."
    BrowseDomain.FEED -> "No feeds yet — tap + to subscribe to one."
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
    BrowseDomain.NOTES -> "notes"
    BrowseDomain.LISTS -> "lists"
    BrowseDomain.MOMENTS -> "moments"
    BrowseDomain.CHALLENGES -> "challenges"
    BrowseDomain.ACCOUNTS -> "financial"
    BrowseDomain.FEED -> "feed"
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
        BrowseDomain.NOTES -> NoteDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.LISTS -> ListDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.MOMENTS -> MomentDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.CHALLENGES -> ChallengeDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.ACCOUNTS -> AccountDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
        BrowseDomain.FEED -> FeedDetailScreen(row, sharedTransitionScope, animatedVisibilityScope, onBack, onActionComplete)
    }
}

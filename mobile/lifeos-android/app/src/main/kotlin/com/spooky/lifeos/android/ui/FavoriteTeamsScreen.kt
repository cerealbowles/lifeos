package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.FavoriteTeamRow
import kotlinx.coroutines.launch

/**
 * Port of components/settings/sports-form.tsx — the web app's only home for following/
 * unfollowing teams, previously web-only despite Sports itself (game odds/schedule) already
 * being native. Reached from a star button on the Sports Browse list (BrowseScreen.kt), not a
 * seventh BrowseDomain — games stay a flat read-only list, this is a follow-list, closer in
 * shape to a settings sub-screen than a browsable record type.
 *
 * Sport/team pickers use the same horizontally-scrollable `FilterChip` row as the Grow stage
 * selector rather than a dropdown menu — one fewer Compose API to keep in sync with the
 * project's Material3 BOM version, and it's already the app's established "pick one of N"
 * pattern (BrowseDetailScreens.kt/BrowseCreateScreens.kt's `ChipRow`).
 */
@Composable
fun FavoriteTeamsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val scope = rememberCoroutineScope()

    var teams by remember { mutableStateOf<List<FavoriteTeamRow>?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var refreshKey by remember { mutableIntStateOf(0) }

    var sport by remember { mutableStateOf(SPORT_OPTIONS.first().key) }
    var teamAbbr by remember { mutableStateOf(listTeamsForSport(sport).first().abbr) }

    LaunchedEffect(refreshKey) {
        loading = true
        loadError = null
        when (val result = client.listFavoriteTeams()) {
            is ApiResult.Success -> teams = result.value
            is ApiResult.Failure -> loadError = result.message
        }
        loading = false
    }

    CreateScaffold("Favorite Teams", onBack) {
        when {
            loading && teams == null -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LifeosColors.accent)
            }
            loadError != null && teams == null -> Text(
                "Couldn't load favorite teams — $loadError",
                color = LifeosColors.mutedFg,
                style = MaterialTheme.typography.bodyMedium,
            )
            teams.isNullOrEmpty() -> Text(
                "Not following any teams yet.",
                color = LifeosColors.mutedFg,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            else -> LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 8.dp),
            ) {
                items(teams.orEmpty(), key = { it.id }) { team ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(team.teamName, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground)
                            Text(team.sport.uppercase(), style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
                        }
                        IconButton(onClick = {
                            scope.launch {
                                if (client.removeFavoriteTeam(team.id) is ApiResult.Success) refreshKey++
                            }
                        }) {
                            Icon(Icons.Filled.Delete, contentDescription = "Stop following ${team.teamName}", tint = LifeosColors.overdueFg)
                        }
                    }
                }
            }
        }

        Column(modifier = Modifier.padding(top = 16.dp)) {
            Text("Follow a team", style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg, modifier = Modifier.padding(bottom = 6.dp))
            ChipRow(SPORT_OPTIONS.map { it.key to it.label }, sport) { key ->
                sport = key
                teamAbbr = listTeamsForSport(key).first().abbr
            }
            val teamsForSport = listTeamsForSport(sport)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 16.dp)) {
                items(teamsForSport, key = { it.abbr }) { team ->
                    FilterChip(
                        selected = teamAbbr == team.abbr,
                        onClick = { teamAbbr = team.abbr },
                        label = { Text(team.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = LifeosColors.accent,
                            selectedLabelColor = LifeosColors.background,
                            containerColor = LifeosColors.glassSurface,
                            labelColor = LifeosColors.mutedFg,
                        ),
                    )
                }
            }

            ActionButton(
                label = "Follow",
                color = LifeosColors.accent,
                onClick = {
                    val result = client.addFavoriteTeam(sport, teamAbbr)
                    if (result is ApiResult.Success) refreshKey++
                    result
                },
                onSuccess = {},
            )
        }
    }
}

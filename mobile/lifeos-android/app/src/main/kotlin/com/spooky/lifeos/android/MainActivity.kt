package com.spooky.lifeos.android

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.spooky.lifeos.android.db.TodayCache
import com.spooky.lifeos.android.sync.AuthClient
import com.spooky.lifeos.android.sync.LoginResult
import com.spooky.lifeos.android.sync.TodayClient
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.TasksSyncWorker
import com.spooky.lifeos.android.sync.TodayActionsClient
import com.spooky.lifeos.android.sync.isCompletable
import com.spooky.lifeos.android.sync.TodayFetchResult
import com.spooky.lifeos.android.sync.TodayRefreshWorker
import com.spooky.lifeos.android.sync.WeatherClient
import com.spooky.lifeos.android.sync.WhoopSyncService
import com.spooky.lifeos.android.ui.environment.EnvironmentalBackground
import com.spooky.lifeos.android.ui.DueBadge
import com.spooky.lifeos.android.ui.ItemDetailSheet
import com.spooky.lifeos.android.ui.LifeosColors
import com.spooky.lifeos.android.ui.PulseIndicator
import com.spooky.lifeos.android.ui.SwipeToCompleteRow
import com.spooky.lifeos.android.ui.itemOpensSheet
import com.spooky.lifeos.android.ui.motion.Motion
import com.spooky.lifeos.android.ui.TasksScreen
import com.spooky.lifeos.android.ui.TodayItemRow
import com.spooky.lifeos.android.ui.TodayOverview
import com.spooky.lifeos.android.ui.WeatherSummary
import com.spooky.lifeos.android.ui.WeatherView
import com.spooky.lifeos.android.ui.domainLabel
import com.spooky.lifeos.android.ui.greeting
import com.spooky.lifeos.android.ui.lifeosDarkColorScheme
import com.spooky.lifeos.android.ui.parseTodayOverview
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // BLE (for WhoopSyncService) + notifications (its persistent foreground-service
        // notification) — requested unconditionally at launch like the rest of this app's
        // permissions, not deferred until the Settings toggle is flipped, so a first-time
        // "enable Whoop sync" tap doesn't itself need a separate permission round-trip.
        val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions += Manifest.permission.BLUETOOTH_SCAN
            permissions += Manifest.permission.BLUETOOTH_CONNECT
        } else {
            permissions += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions += Manifest.permission.POST_NOTIFICATIONS
        }
        permissionLauncher.launch(permissions.toTypedArray())

        val config = LifeosConfig(applicationContext)
        if (config.isWhoopSyncEnabled() && config.isLoggedIn()) {
            ContextCompat.startForegroundService(this, Intent(this, WhoopSyncService::class.java))
        }

        setContent {
            MaterialTheme(colorScheme = lifeosDarkColorScheme(), typography = com.spooky.lifeos.android.ui.LifeTypography) {
                // Reference art comparison (3 inspiration screenshots, confirmed against this
                // build) showed the landscape scene used sparingly as a *hero* image atop Home
                // only — the rest of the UI sits on a calm flat background, not a landscape
                // bleeding through every card on every tab. Full-screen root-level
                // `EnvironmentalBackground` (this file's earlier approach) was part of why the
                // mountains read as "rough" — low-contrast shapes competing with text everywhere.
                // Flat background here now; `TodayScreen`'s own hero owns the landscape.
                Box(modifier = Modifier.fillMaxSize().background(LifeosColors.background)) {
                    Surface(modifier = Modifier.fillMaxSize(), color = Color.Transparent) {
                        LifeosApp()
                    }
                }
            }
        }
    }
}

@Composable
fun LifeosApp() {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    var loggedIn by remember { mutableStateOf(config.isLoggedIn()) }

    if (loggedIn) {
        AppShell(onLogout = {
            config.clearToken()
            loggedIn = false
        })
    } else {
        LoginScreen(onLoggedIn = { loggedIn = true })
    }
}

// Labels follow the design brief's Home/Today/Health/Journal/More nav (§13), mapped onto the
// app's real screens rather than the brief's literal names — see the redesign plan's "Screen /
// nav mapping" section. Enum identifiers (TODAY/TASKS/...) are unchanged on purpose (every
// `AppTab.TODAY` reference elsewhere still means "the immersive overview screen"); only the
// user-facing `label` moved. BROWSE keeps its honest name rather than "Journal" — this screen
// browses six real domains, it doesn't do reflective journaling, and LifeOS has no journal
// feature to back that label with.
private enum class AppTab(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    TODAY("Home", Icons.Filled.WbSunny),
    TASKS("Today", Icons.Filled.CheckBox),
    HEALTH("Health", Icons.Filled.Favorite),
    BROWSE("Browse", Icons.Filled.Apps),
    SETTINGS("More", Icons.Filled.Settings),
}

/**
 * Bottom-nav shell for everything past login — Today (read-only cache) and Tasks (offline-first
 * writes) are fully built; Browse (per-domain lists) and Settings (device/token management) are
 * scaffolded here now so this nav structure only needs to be built once, with their real screens
 * filling in as separate slices of work.
 */
@Composable
private fun AppShell(onLogout: () -> Unit) {
    var tab by remember { mutableStateOf(AppTab.TODAY) }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f)) {
            when (tab) {
                AppTab.TODAY -> TodayScreen()
                AppTab.TASKS -> TasksScreen()
                AppTab.HEALTH -> com.spooky.lifeos.android.ui.HealthScreen()
                AppTab.BROWSE -> com.spooky.lifeos.android.ui.BrowseScreen()
                AppTab.SETTINGS -> com.spooky.lifeos.android.ui.SettingsScreen(onLogout = onLogout)
            }
        }
        NavPillBar(tab = tab, onSelect = { tab = it })
    }
}

/**
 * Custom bottom nav — replaces the stock Material3 NavigationBar/NavigationBarItem (whose
 * own selection indicator only fades in/out per item, not a single pill sliding between
 * positions) with a genuinely sliding pill plus press compress/spring feedback per tab.
 * Transparent background so it reads as part of the flat app background rather than a
 * separate opaque strip.
 */
@Composable
private fun NavPillBar(tab: AppTab, onSelect: (AppTab) -> Unit) {
    BoxWithConstraints(
        modifier = Modifier.fillMaxWidth().navigationBarsPadding().height(64.dp),
    ) {
        val slotWidth = maxWidth / AppTab.entries.size
        val selectedIndex = AppTab.entries.indexOf(tab)
        val pillOffset by animateDpAsState(
            targetValue = slotWidth * selectedIndex,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessMedium,
            ),
            label = "NavPillOffset",
        )

        Box(
            modifier = Modifier
                .offset(x = pillOffset)
                .width(slotWidth)
                .fillMaxHeight()
                .padding(horizontal = 14.dp, vertical = 10.dp)
                .background(LifeosColors.glassSurface, RoundedCornerShape(20.dp)),
        )

        Row(modifier = Modifier.fillMaxSize()) {
            AppTab.entries.forEach { entry ->
                NavTabItem(entry = entry, selected = tab == entry, onClick = { onSelect(entry) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NavTabItem(entry: AppTab, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.85f else 1f,
        animationSpec = Motion.SnappySpring,
        label = "NavItemPress",
    )
    val tint = if (selected) LifeosColors.accent else LifeosColors.mutedFg

    Column(
        modifier = modifier
            .fillMaxHeight()
            .scale(scale)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(entry.icon, contentDescription = entry.label, tint = tint, modifier = Modifier.size(22.dp))
        Text(entry.label, style = MaterialTheme.typography.labelSmall, color = tint)
    }
}

@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    val scope = rememberCoroutineScope()

    var baseUrl by remember { mutableStateOf(config.getBaseUrl() ?: "") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().statusBarsPadding().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("LifeOS", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = LifeosColors.foreground)
        Text("Sign in to sync your day.", style = MaterialTheme.typography.bodyMedium, color = LifeosColors.mutedFg)
        OutlinedTextField(
            value = baseUrl,
            onValueChange = { baseUrl = it },
            label = { Text("LifeOS URL") },
            placeholder = { Text("https://kilroys.toyger-ruffe.ts.net") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, autoCorrectEnabled = false, capitalization = KeyboardCapitalization.None),
        )
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, autoCorrectEnabled = false, capitalization = KeyboardCapitalization.None),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, autoCorrectEnabled = false, capitalization = KeyboardCapitalization.None),
        )
        Button(
            enabled = !loading && baseUrl.isNotBlank() && email.isNotBlank() && password.isNotBlank(),
            onClick = {
                loading = true
                error = null
                scope.launch {
                    val normalizedUrl = baseUrl.trim().trimEnd('/')
                    android.util.Log.i("LifeosSync", "Logging in to $normalizedUrl…")
                    when (val result = AuthClient(normalizedUrl).login(email, password)) {
                        is LoginResult.Success -> {
                            android.util.Log.i("LifeosSync", "Login succeeded.")
                            config.saveBaseUrl(normalizedUrl)
                            config.saveToken(result.token)
                            config.saveTokenId(result.tokenId)
                            TodayRefreshWorker.schedule(context)
                            TasksSyncWorker.schedule(context)
                            onLoggedIn()
                        }
                        is LoginResult.Failure -> {
                            android.util.Log.w("LifeosSync", "Login failed: ${result.message}")
                            error = result.message
                        }
                    }
                    loading = false
                }
            },
        ) {
            Text(if (loading) "Signing in…" else "Sign in")
        }
        error?.let { Text(it, color = LifeosColors.overdueFg, style = MaterialTheme.typography.bodySmall) }
    }
}

/**
 * Home's mountain hero — the landscape scene sized and used the way the reference art actually
 * shows it (three inspiration screenshots the user shared, compared directly against this
 * build): a real hero banner at the top of Home only, greeting overlaid in the serif display
 * face over a bottom scrim for legibility, not a faint wash bleeding through every card on
 * every tab (that was this file's original root-level approach — see the comment at the
 * `MaterialTheme` call site). Owns its own [EnvironmentalBackground] instance sized to the hero
 * box; the composable is self-contained (polls its own clock, drives its own crossfade) so this
 * doesn't need to thread any state down from `TodayScreen`.
 */
@Composable
private fun TodayHero(greeting: String, refreshing: Boolean, onRefresh: () -> Unit, weather: WeatherView?) {
    Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
        EnvironmentalBackground(modifier = Modifier.fillMaxSize(), weather = weather)
        // Bottom scrim — the mountain/treeline art is busiest right where the greeting sits,
        // so darken just that band rather than relying on the parchment text color alone.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f)),
                        startY = 0.4f,
                        endY = 1f,
                    ),
                ),
        )
        Row(
            modifier = Modifier.fillMaxWidth().statusBarsPadding().align(Alignment.TopEnd).padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
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
            modifier = Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp, vertical = 14.dp),
        )
    }
}

@Composable
fun TodayScreen() {
    val context = LocalContext.current
    val config = remember { LifeosConfig(context) }
    val cache = remember { TodayCache(context) }
    val scope = rememberCoroutineScope()

    var overview by remember { mutableStateOf<TodayOverview?>(null) }
    var lastFetchedMs by remember { mutableStateOf<Long?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var offlineNotice by remember { mutableStateOf<String?>(null) }
    var loadedOnce by remember { mutableStateOf(false) }
    var weather by remember { mutableStateOf<WeatherView?>(null) }
    var openItem by remember { mutableStateOf<com.spooky.lifeos.android.ui.TodayItem?>(null) }

    fun loadFromCache() {
        cache.load()?.let { cached ->
            overview = runCatching { parseTodayOverview(cached.jsonText) }.getOrNull()
            lastFetchedMs = cached.fetchedAtMs
        }
    }

    fun refresh() {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return
        refreshing = true
        android.util.Log.i("LifeosSync", "Fetching $baseUrl/api/today…")
        scope.launch {
            when (val result = TodayClient(baseUrl, token).fetchToday()) {
                is TodayFetchResult.Success -> {
                    android.util.Log.i("LifeosSync", "Today fetch OK (${result.jsonText.length} bytes).")
                    cache.save(result.jsonText)
                    offlineNotice = null
                    loadFromCache()
                }
                is TodayFetchResult.Failure -> {
                    android.util.Log.w("LifeosSync", "Today fetch failed: ${result.message}")
                    offlineNotice = "Offline — showing last synced data (${result.message})"
                }
            }
            refreshing = false
        }
        // Independent of the Today fetch above — a failed/not-connected weather call
        // shouldn't trip Today's own offline notice, same self-suppressing spirit as the
        // web card (WeatherClient already collapses any failure to null internally).
        scope.launch { weather = WeatherClient(baseUrl, token).fetch() }
    }

    if (!loadedOnce) {
        loadFromCache()
        refresh()
        loadedOnce = true
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TodayHero(greeting = greeting(), refreshing = refreshing, onRefresh = { refresh() }, weather = weather)

        val current = overview
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(top = 16.dp, bottom = 16.dp),
        ) {
            item {
                PulseIndicator(pulse = current?.pulse ?: "calm", nowCount = current?.now?.size ?: 0)
            }
            weather?.let { w ->
                item { WeatherSummary(w) }
            }
            lastFetchedMs?.let {
                item {
                    val minutesAgo = (System.currentTimeMillis() - it) / TimeUnit.MINUTES.toMillis(1)
                    Text(
                        if (minutesAgo <= 0) "Updated just now" else "Updated ${minutesAgo}m ago",
                        style = MaterialTheme.typography.bodySmall,
                        color = LifeosColors.mutedFg,
                    )
                }
            }
            offlineNotice?.let { notice ->
                item {
                    Text(notice, style = MaterialTheme.typography.bodySmall, color = LifeosColors.dueSoonFg)
                }
            }

            if (current == null) {
                item {
                    Text("No cached data yet — connect once to sync.", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
                }
            } else {
                if (current.now.isNotEmpty()) {
                    item {
                        SectionHeader("RIGHT NOW", count = current.now.size)
                    }
                    // Swipe-to-complete on NOW only (matching now-list.tsx — TODAY items are
                    // tap-through-only on the web too), and only for domains that actually have
                    // a one-tap complete action (isCompletable mirrors getCompleteRequest).
                    itemsIndexed(current.now, key = { _, it -> "now-${it.domain}-${it.id}" }) { index, todayItem ->
                        com.spooky.lifeos.android.ui.motion.StaggeredEntrance(index = index) {
                            if (isCompletable(todayItem)) {
                                SwipeToCompleteRow(
                                    onComplete = {
                                        val baseUrl = config.getBaseUrl()
                                        val token = config.getToken()
                                        if (baseUrl == null || token == null) {
                                            false
                                        } else {
                                            val result = TodayActionsClient(baseUrl, token).complete(todayItem)
                                            if (result is ApiResult.Success) {
                                                refresh()
                                                true
                                            } else {
                                                false
                                            }
                                        }
                                    },
                                ) {
                                    TodayItemRow(
                                        todayItem,
                                        vividAvatar = true,
                                        onClick = { openItem = todayItem }.takeIf { itemOpensSheet(todayItem) },
                                    )
                                }
                            } else {
                                TodayItemRow(
                                    todayItem,
                                    vividAvatar = true,
                                    onClick = { openItem = todayItem }.takeIf { itemOpensSheet(todayItem) },
                                )
                            }
                        }
                    }
                }
                current.today.forEach { (domain, domainItems) ->
                    if (domainItems.isNotEmpty()) {
                        item(key = "header-$domain") { SectionHeader(domainLabel(domain).uppercase(), count = domainItems.size) }
                        itemsIndexed(domainItems, key = { _, it -> "today-$domain-${it.id}" }) { index, item ->
                            com.spooky.lifeos.android.ui.motion.StaggeredEntrance(index = index) {
                                TodayItemRow(
                                    item,
                                    vividAvatar = false,
                                    onClick = { openItem = item }.takeIf { itemOpensSheet(item) },
                                )
                            }
                        }
                    }
                }
                if (current.now.isEmpty() && current.today.values.all { it.isEmpty() }) {
                    item {
                        Text("All done. Nothing needs you right now.", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }

    ItemDetailSheet(
        item = openItem,
        baseUrl = config.getBaseUrl(),
        token = config.getToken(),
        onDismiss = { openItem = null },
        onCheckedIn = {
            openItem = null
            refresh()
        },
    )
}

/** Thin wrapper over the shared `ui/components/SectionHeader` — keeps this file's existing
 *  `SectionHeader(title, count)` call shape (item count as trailing text) rather than touching
 *  every call site, while adopting the shared serif-styled title instead of a duplicate
 *  hand-rolled Row. */
@Composable
private fun SectionHeader(title: String, count: Int) {
    com.spooky.lifeos.android.ui.components.SectionHeader(
        title = title,
        modifier = Modifier.padding(top = 4.dp),
        trailing = { Text(count.toString(), style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg) },
    )
}

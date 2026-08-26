package com.spooky.lifeos.android.ui

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.BrowseClient
import kotlinx.coroutines.launch
import org.json.JSONObject

// --- Shared formatting helpers — small local ports rather than a shared date-utils module,
// matching this codebase's existing per-file convention (HealthScreen.kt/SleepComponents.kt
// each keep their own tiny formatters instead of a central one). ---

private fun dateOnly(iso: String?): String? = iso?.take(10)

private fun dateTime(iso: String?): String? = iso?.replace("T", " ")?.take(16)

/** Ports lib/db/schema/finance.ts's one-variant DueRule — {type:"monthly_day", day}. */
private fun describeDueRule(dueRule: JSONObject?): String? {
    if (dueRule == null) return null
    return when (dueRule.optString("type")) {
        "monthly_day" -> "Monthly on day ${dueRule.optInt("day")}"
        else -> null
    }
}

/** Exact port of components/tasks/routine-list.tsx's describeRecurrence — same three cases,
 *  same wording, so a routine reads identically on web and native. */
private fun describeRecurrence(type: String, config: JSONObject?): String {
    if (config == null) return type
    return when (config.optString("type", type)) {
        "interval" -> "Every ${config.optInt("days")} days"
        "weekly" -> {
            val arr = config.optJSONArray("daysOfWeek")
            val days = arr?.let { (0 until it.length()).map { i -> it.getString(i) } } ?: emptyList()
            "Weekly: ${days.joinToString(", ")}"
        }
        "monthly_day" -> "Monthly on day ${config.optInt("day")}"
        else -> type
    }
}

/**
 * Shared full-screen frame every domain's detail screen sits inside — back button + title +
 * optional status badge + scrollable field list. `sharedKey` must match [browseSharedKey] for
 * the same row's collapsed Card in BrowseScreen.kt, or the shared-element transform won't find
 * its counterpart.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun BrowseDetailScaffold(
    sharedKey: String,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    title: String,
    badge: String? = null,
    badgeColor: Color = LifeosColors.mutedFg,
    // Direct user request, 2026-08-26 — an edit affordance next to back/title. `null` hides the
    // button entirely (CalendarDetailScreen uses this for a non-"manual" — i.e. synced — event,
    // which the backend won't let this endpoint touch anyway; see updateManualEvent).
    onEdit: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    with(sharedTransitionScope) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .sharedBounds(
                    rememberSharedContentState(key = sharedKey),
                    animatedVisibilityScope = animatedVisibilityScope,
                )
                .background(LifeosColors.background)
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
                }
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    color = LifeosColors.foreground,
                    modifier = Modifier.padding(start = 4.dp).weight(1f),
                )
                onEdit?.let {
                    IconButton(onClick = it) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit", tint = LifeosColors.accent)
                    }
                }
            }
            badge?.let {
                Box(
                    modifier = Modifier
                        .padding(top = 8.dp, start = 8.dp)
                        .background(badgeColor.copy(alpha = 0.18f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                ) {
                    Text(it, color = badgeColor, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
            content()
        }
    }
}

@Composable
private fun DetailField(label: String, value: String) {
    Column(modifier = Modifier.padding(bottom = 14.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = LifeosColors.mutedFg)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground, modifier = Modifier.padding(top = 2.dp))
    }
}

/**
 * One write action wired to an existing endpoint — press, wait, then either bubble success
 * (caller pops back to the list) or show the server's error inline. `onClick` returns
 * `ApiResult<Unit>` directly from a `BrowseClient` call, matching the existing
 * `ApiResult.Success`/`Failure` convention rather than inventing a new callback shape.
 */
/** Not `private` — reused by BrowseCreateScreens.kt's submit buttons, same busy/inline-error
 *  shape as every write action here. */
@Composable
fun ActionButton(label: String, color: Color, onClick: suspend () -> ApiResult<Unit>, onSuccess: () -> Unit) {
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column {
        Button(
            onClick = {
                if (busy) return@Button
                busy = true
                error = null
                scope.launch {
                    when (val result = onClick()) {
                        is ApiResult.Success -> onSuccess()
                        is ApiResult.Failure -> error = result.message
                    }
                    busy = false
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = LifeosColors.background),
            enabled = !busy,
        ) {
            if (busy) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = LifeosColors.background, strokeWidth = 2.dp)
            } else {
                Text(label)
            }
        }
        error?.let {
            Text(
                "Couldn't complete — $it",
                color = LifeosColors.overdueFg,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

/** Not `private` — reused by BrowseCreateScreens.kt. */
fun browseClientFor(context: android.content.Context): BrowseClient {
    val config = LifeosConfig(context)
    return BrowseClient(config.getBaseUrl() ?: "", config.getToken() ?: "")
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun PetDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val o = remember(row.raw) { JSONObject(row.raw) }

    val active = o.optBoolean("active", true)
    val species = o.optString("species").takeIf { it.isNotBlank() }
    val breed = o.optString("breed").takeIf { it.isNotBlank() && !o.isNull("breed") }
    val birthDate = dateOnly(o.optString("birthDate").takeIf { o.has("birthDate") && !o.isNull("birthDate") })
    val weight = o.optString("weight").takeIf { o.has("weight") && !o.isNull("weight") }
    val notes = o.optString("notes").takeIf { it.isNotBlank() && !o.isNull("notes") }

    var editing by remember { mutableStateOf(false) }
    var nameField by remember(row.raw) { mutableStateOf(row.title) }
    var speciesField by remember(row.raw) { mutableStateOf(species ?: "") }
    var breedField by remember(row.raw) { mutableStateOf(breed ?: "") }
    var birthDateField by remember(row.raw) { mutableStateOf(birthDate ?: "") }

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.PET, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        badge = if (!active) "Retired" else null,
        onEdit = { editing = true }.takeIf { !editing },
    ) {
        if (editing) {
            FormField("Name", nameField, { nameField = it })
            FormField("Species", speciesField, { speciesField = it })
            FormField("Breed (optional)", breedField, { breedField = it })
            FormField("Birth date (YYYY-MM-DD, optional)", birthDateField, { birthDateField = it })
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = "Save",
                color = LifeosColors.accent,
                onClick = {
                    client.updatePet(row.id, nameField.trim(), speciesField.trim(), breedField.trim().ifBlank { null }, birthDateField.trim().ifBlank { null })
                },
                onSuccess = { onActionComplete(); onBack() },
            )
        } else {
            species?.let { DetailField("Species", it) }
            breed?.let { DetailField("Breed", it) }
            birthDate?.let { DetailField("Birth date", it) }
            weight?.let { DetailField("Weight", it) }
            notes?.let { DetailField("Notes", it) }

            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = if (active) "Retire" else "Restore",
                color = if (active) LifeosColors.overdueFg else LifeosColors.accent,
                onClick = { client.updatePetActive(row.id, !active) },
                onSuccess = { onActionComplete(); onBack() },
            )
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun PlantDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val o = remember(row.raw) { JSONObject(row.raw) }

    val active = o.optBoolean("active", true)
    val stageRaw = o.optString("stage").takeIf { it.isNotBlank() }
    val stage = stageRaw?.replaceFirstChar { it.uppercase() }
    val datePlanted = dateOnly(o.optString("datePlanted").takeIf { o.has("datePlanted") && !o.isNull("datePlanted") })
    val trichomeRaw = o.optString("trichomeStatus").takeIf { it.isNotBlank() && !o.isNull("trichomeStatus") }
    val trichome = trichomeRaw?.replaceFirstChar { it.uppercase() }
    val lastChecked = dateTime(o.optString("lastCheckedAt").takeIf { o.has("lastCheckedAt") && !o.isNull("lastCheckedAt") })
    val notes = o.optString("notes").takeIf { it.isNotBlank() && !o.isNull("notes") }

    var editing by remember { mutableStateOf(false) }
    var strainField by remember(row.raw) { mutableStateOf(row.title) }
    var stageField by remember(row.raw) { mutableStateOf(stageRaw ?: "seedling") }
    var trichomeField by remember(row.raw) { mutableStateOf(trichomeRaw ?: "clear") }
    var notesField by remember(row.raw) { mutableStateOf(notes ?: "") }

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.GROW, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        badge = if (!active) "Harvested" else null,
        onEdit = { editing = true }.takeIf { !editing },
    ) {
        if (editing) {
            FormField("Strain", strainField, { strainField = it })
            Text("Stage", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
            ChipRow(listOf("seedling" to "Seedling", "veg" to "Veg", "flower" to "Flower", "flush" to "Flush"), stageField) { stageField = it }
            Text("Trichomes", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
            ChipRow(listOf("clear" to "Clear", "cloudy" to "Cloudy", "amber" to "Amber"), trichomeField) { trichomeField = it }
            FormField("Notes (optional)", notesField, { notesField = it }, singleLine = false)
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = "Save",
                color = LifeosColors.accent,
                onClick = { client.updatePlant(row.id, strainField.trim(), stageField, trichomeField, notesField.trim().ifBlank { null }) },
                onSuccess = { onActionComplete(); onBack() },
            )
        } else {
            stage?.let { DetailField("Stage", it) }
            datePlanted?.let { DetailField("Planted", it) }
            trichome?.let { DetailField("Trichomes", it) }
            DetailField("Last checked", lastChecked ?: "Never checked")
            notes?.let { DetailField("Notes", it) }

            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = if (active) "Mark Harvested" else "Restore",
                color = if (active) LifeosColors.dueSoonFg else LifeosColors.accent,
                onClick = { client.updatePlantActive(row.id, !active) },
                onSuccess = { onActionComplete(); onBack() },
            )
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun MoneyDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val o = remember(row.raw) { JSONObject(row.raw) }

    val amount = o.optString("amount").takeIf { o.has("amount") && !o.isNull("amount") }
    val dueRule = o.optJSONObject("dueRule")
    val nextDueAt = dateOnly(o.optString("nextDueAt").takeIf { o.has("nextDueAt") && !o.isNull("nextDueAt") })
    val autopay = o.optBoolean("autopay", false)
    val notes = o.optString("notes").takeIf { it.isNotBlank() && !o.isNull("notes") }

    var editing by remember { mutableStateOf(false) }
    var nameField by remember(row.raw) { mutableStateOf(row.title) }
    var amountField by remember(row.raw) { mutableStateOf(amount ?: "") }
    var dueDayField by remember(row.raw) { mutableStateOf((dueRule?.optInt("day", 1) ?: 1).toString()) }
    var autopayField by remember(row.raw) { mutableStateOf(autopay) }
    var notesField by remember(row.raw) { mutableStateOf(notes ?: "") }

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.FINANCIAL, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        badge = if (autopay) "Autopay" else null,
        badgeColor = LifeosColors.accent,
        onEdit = { editing = true }.takeIf { !editing },
    ) {
        if (editing) {
            FormField("Name", nameField, { nameField = it })
            FormField("Amount (optional)", amountField, { amountField = it }, keyboardType = KeyboardType.Decimal)
            FormField("Due day of month (1-31)", dueDayField, { dueDayField = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
            FormSwitch("Autopay", autopayField) { autopayField = it }
            FormField("Notes (optional)", notesField, { notesField = it }, singleLine = false)
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = "Save",
                color = LifeosColors.accent,
                onClick = {
                    val day = dueDayField.toIntOrNull()?.coerceIn(1, 31) ?: 1
                    client.updateReminder(row.id, nameField.trim(), amountField.trim().ifBlank { null }, day, autopayField, notesField.trim().ifBlank { null })
                },
                onSuccess = { onActionComplete(); onBack() },
            )
            return@BrowseDetailScaffold
        }
        amount?.let { DetailField("Amount", "$$it") }
        describeDueRule(dueRule)?.let { DetailField("Schedule", it) }
        nextDueAt?.let { DetailField("Next due", it) }
        notes?.let { DetailField("Notes", it) }

        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Delete",
            color = LifeosColors.overdueFg,
            onClick = { client.deleteReminder(row.id) },
            onSuccess = { onActionComplete(); onBack() },
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun RoutineDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val o = remember(row.raw) { JSONObject(row.raw) }

    val description = o.optString("description").takeIf { it.isNotBlank() && !o.isNull("description") }
    val category = o.optString("category").takeIf { it.isNotBlank() && !o.isNull("category") }
    val recurrenceType = o.optString("recurrenceType", "")
    val recurrenceConfig = o.optJSONObject("recurrenceConfig")
    val lastCompleted = dateTime(o.optString("lastCompletedAt").takeIf { o.has("lastCompletedAt") && !o.isNull("lastCompletedAt") })
    val nextDue = dateTime(o.optString("nextDueAt").takeIf { o.has("nextDueAt") && !o.isNull("nextDueAt") })

    var editing by remember { mutableStateOf(false) }
    var nameField by remember(row.raw) { mutableStateOf(row.title) }
    var descriptionField by remember(row.raw) { mutableStateOf(description ?: "") }
    var categoryField by remember(row.raw) { mutableStateOf(category ?: "") }
    var recurrenceTypeField by remember(row.raw) { mutableStateOf(recurrenceType.ifBlank { "interval" }) }
    var intervalDaysField by remember(row.raw) { mutableStateOf((recurrenceConfig?.optInt("days", 30) ?: 30).toString()) }
    var weeklyDaysField by remember(row.raw) {
        val arr = recurrenceConfig?.optJSONArray("daysOfWeek")
        mutableStateOf((0 until (arr?.length() ?: 0)).mapNotNull { arr?.optString(it) }.toSet())
    }
    var monthlyDayField by remember(row.raw) { mutableStateOf((recurrenceConfig?.optInt("day", 1) ?: 1).toString()) }

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.ROUTINE, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        onEdit = { editing = true }.takeIf { !editing },
    ) {
        if (editing) {
            FormField("Name", nameField, { nameField = it })
            FormField("Description (optional)", descriptionField, { descriptionField = it }, singleLine = false)
            FormField("Category (optional)", categoryField, { categoryField = it })
            Text("Repeats", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
            ChipRow(listOf("interval" to "Interval", "weekly" to "Weekly", "monthly_day" to "Monthly"), recurrenceTypeField) { recurrenceTypeField = it }
            when (recurrenceTypeField) {
                "interval" -> FormField("Every N days", intervalDaysField, { intervalDaysField = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
                "weekly" -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                        listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT").forEach { day ->
                            androidx.compose.material3.FilterChip(
                                selected = day in weeklyDaysField,
                                onClick = { weeklyDaysField = if (day in weeklyDaysField) weeklyDaysField - day else weeklyDaysField + day },
                                label = { Text(day) },
                                colors = androidx.compose.material3.FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = LifeosColors.accent,
                                    selectedLabelColor = LifeosColors.background,
                                    containerColor = LifeosColors.glassSurface,
                                    labelColor = LifeosColors.mutedFg,
                                ),
                            )
                        }
                    }
                }
                else -> FormField("Day of month (1-31)", monthlyDayField, { monthlyDayField = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
            }
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = "Save",
                color = LifeosColors.accent,
                onClick = {
                    val config = when (recurrenceTypeField) {
                        "interval" -> JSONObject().put("type", "interval").put("days", intervalDaysField.toIntOrNull() ?: 30)
                        "weekly" -> JSONObject().put("type", "weekly").put("daysOfWeek", org.json.JSONArray(weeklyDaysField.toList()))
                        else -> JSONObject().put("type", "monthly_day").put("day", monthlyDayField.toIntOrNull()?.coerceIn(1, 31) ?: 1)
                    }
                    client.updateRoutine(row.id, nameField.trim(), descriptionField.trim().ifBlank { null }, categoryField.trim().ifBlank { null }, recurrenceTypeField, config)
                },
                onSuccess = { onActionComplete(); onBack() },
            )
            return@BrowseDetailScaffold
        }
        category?.let { DetailField("Category", it) }
        description?.let { DetailField("Description", it) }
        DetailField("Recurrence", describeRecurrence(recurrenceType, recurrenceConfig))
        DetailField("Last completed", lastCompleted ?: "Never")
        nextDue?.let { DetailField("Next due", it) }

        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ActionButton(
                label = "Complete",
                color = LifeosColors.accent,
                onClick = { client.completeRoutine(row.id) },
                onSuccess = { onActionComplete(); onBack() },
            )
            ActionButton(
                label = "Skip",
                color = LifeosColors.mutedFg,
                onClick = { client.skipRoutine(row.id) },
                onSuccess = { onActionComplete(); onBack() },
            )
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun CalendarDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val o = remember(row.raw) { JSONObject(row.raw) }

    val startAt = dateTime(o.optString("startAt").takeIf { o.has("startAt") && !o.isNull("startAt") })
    val endAt = dateTime(o.optString("endAt").takeIf { o.has("endAt") && !o.isNull("endAt") })
    val allDay = o.optBoolean("allDay", false)
    val location = o.optString("location").takeIf { it.isNotBlank() && !o.isNull("location") }
    // `description` is parsed straight off calendar_events, unlike the web app (which reads
    // the same field but never renders it anywhere) — a genuinely new bit of visible value here.
    val description = o.optString("description").takeIf { it.isNotBlank() && !o.isNull("description") }
    val status = o.optString("status").takeIf { it.isNotBlank() }
    val source = o.optString("source").takeIf { it.isNotBlank() && !o.isNull("source") }
    // Only a "manual" event can be edited — a CalDAV-synced one would just get overwritten by
    // the next sync (same gate lib/calendar/service.ts's updateManualEvent enforces server-side).
    val isManual = source == "manual"

    var editing by remember { mutableStateOf(false) }
    var titleField by remember(row.raw) { mutableStateOf(row.title) }
    var startAtField by remember(row.raw) { mutableStateOf(o.optString("startAt").take(16)) }
    var endAtField by remember(row.raw) { mutableStateOf(o.optString("endAt").takeIf { o.has("endAt") && !o.isNull("endAt") }?.take(16) ?: "") }
    var allDayField by remember(row.raw) { mutableStateOf(allDay) }
    var locationField by remember(row.raw) { mutableStateOf(location ?: "") }
    var descriptionField by remember(row.raw) { mutableStateOf(description ?: "") }

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.CALENDAR, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        badge = if (status == "cancelled") "Cancelled" else null,
        badgeColor = LifeosColors.overdueFg,
        onEdit = ({ editing = true }.takeIf { !editing }).takeIf { isManual },
    ) {
        if (editing) {
            FormField("Title", titleField, { titleField = it })
            FormField("Starts (YYYY-MM-DDTHH:mm)", startAtField, { startAtField = it })
            FormField("Ends (optional)", endAtField, { endAtField = it })
            FormSwitch("All day", allDayField) { allDayField = it }
            FormField("Location (optional)", locationField, { locationField = it })
            FormField("Description (optional)", descriptionField, { descriptionField = it }, singleLine = false)
            Spacer(modifier = Modifier.height(8.dp))
            ActionButton(
                label = "Save",
                color = LifeosColors.accent,
                onClick = {
                    client.updateEvent(
                        row.id,
                        titleField.trim(),
                        isoFromLocalField(startAtField.trim()),
                        endAtField.trim().ifBlank { null }?.let { isoFromLocalField(it) },
                        allDayField,
                        locationField.trim().ifBlank { null },
                        descriptionField.trim().ifBlank { null },
                    )
                },
                onSuccess = { onActionComplete(); onBack() },
            )
            return@BrowseDetailScaffold
        }
        DetailField("Starts", if (allDay) "${startAt?.take(10) ?: "—"} · All day" else startAt ?: "—")
        endAt?.let { DetailField("Ends", if (allDay) it.take(10) else it) }
        location?.let { DetailField("Location", it) }
        description?.let { DetailField("Description", it) }
        source?.let { DetailField("Source", it) }

        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Delete",
            color = LifeosColors.overdueFg,
            onClick = { client.deleteCalendarEvent(row.id) },
            onSuccess = { onActionComplete(); onBack() },
        )
    }
}

/** Same bare `YYYY-MM-DDTHH:mm` → seconds-appended ISO fixup as BrowseCreateScreens.kt's
 *  `isoFromLocal` — a second small copy rather than a cross-file import for one line, matching
 *  this codebase's existing per-file tiny-helper convention. */
private fun isoFromLocalField(local: String): String = if (local.count { it == ':' } == 1) "$local:00" else local

/**
 * No write action — GameDTO isn't a LifeOS-owned record (external odds feed, see
 * browseSharedKey/parseSportsRows's synthetic id), and per the research pass for this feature,
 * every field a detail view could show is already present in the list response (no hidden
 * data to reveal) — this is essentially a bigger, single-game version of what the row already
 * summarizes, not a drill-down into something new.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun SportsDetailScreen(
    row: BrowseRow,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onBack: () -> Unit,
    onActionComplete: () -> Unit,
) {
    val o = remember(row.raw) { JSONObject(row.raw) }

    val status = o.optString("status").takeIf { it.isNotBlank() }
    val period = o.optString("period").takeIf { it.isNotBlank() && !o.isNull("period") }
    val startAt = dateTime(o.optString("startAt").takeIf { o.has("startAt") && !o.isNull("startAt") })
    val homeScore = o.optInt("homeScore", -1).takeIf { it >= 0 }
    val awayScore = o.optInt("awayScore", -1).takeIf { it >= 0 }
    val odds = o.optJSONObject("odds")

    BrowseDetailScaffold(
        sharedKey = browseSharedKey(BrowseDomain.SPORTS, row.id),
        sharedTransitionScope = sharedTransitionScope,
        animatedVisibilityScope = animatedVisibilityScope,
        onBack = onBack,
        title = row.title,
        badge = status,
        badgeColor = if (status == "Live") LifeosColors.overdueFg else LifeosColors.mutedFg,
    ) {
        if (homeScore != null && awayScore != null) DetailField("Score", "$awayScore – $homeScore")
        period?.let { DetailField("Period", it) }
        startAt?.let { DetailField("Start", it) }
        if (odds != null) {
            DetailField("Moneyline", "Away ${odds.optInt("awayMoneyline")} · Home ${odds.optInt("homeMoneyline")}")
            val total = odds.optDouble("totalLine", Double.NaN)
            if (!total.isNaN()) {
                DetailField("Total", "$total  (O ${odds.optInt("overOdds")} / U ${odds.optInt("underOdds")})")
            }
        } else {
            DetailField("Odds", "Not available")
        }
    }
}

package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.sync.ApiResult
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * One "add a record" screen per writable Browse domain (Sports is read-only, external data, no
 * create screen) — direct user request, 2026-08-26: "I need functionality" to add/edit records
 * from Browse, not just view + a single status action. Reuses `ActionButton`/`browseClientFor`
 * from BrowseDetailScreens.kt (un-`private`d for this) for the submit action's busy/error
 * handling, and the same rounded/accent-bordered field styling `TasksScreen.kt`'s quick-capture
 * row already established, rather than a third distinct text-field look.
 *
 * Deliberately plain full-screen forms, not the shared-element transition detail screens use —
 * there's no existing row to transform from, this is a fresh "add" action, so a simple
 * back-button scaffold (`CreateScaffold`) is enough.
 */
/** Not `private` — reused by FavoriteTeamsScreen.kt, which is a plain form screen too. */
@Composable
fun CreateScaffold(title: String, onBack: () -> Unit, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = LifeosColors.foreground)
            }
            Text(title, style = MaterialTheme.typography.titleMedium, color = LifeosColors.foreground, modifier = Modifier.padding(start = 4.dp))
        }
        Spacer(modifier = Modifier.height(20.dp))
        content()
    }
}

/** Shared field styling — every create/edit field in Browse uses this, matching the quick-add
 *  row already established on Tasks rather than a bare default `OutlinedTextField`. */
@Composable
fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = LifeosColors.mutedFg) },
        singleLine = singleLine,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = LifeosColors.accent,
            unfocusedBorderColor = LifeosColors.glassBorder,
            focusedTextColor = LifeosColors.foreground,
            unfocusedTextColor = LifeosColors.foreground,
            cursorColor = LifeosColors.accent,
            focusedContainerColor = LifeosColors.glassSurface,
            unfocusedContainerColor = LifeosColors.glassSurface,
            focusedLabelColor = LifeosColors.accent,
            unfocusedLabelColor = LifeosColors.mutedFg,
        ),
        modifier = modifier.fillMaxWidth().padding(bottom = 12.dp),
    )
}

/** A row of single-select `FilterChip`s for a small enum (grow stage, recurrence type) — same
 *  chip styling as the domain switcher in BrowseScreen.kt. */
@Composable
fun ChipRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 12.dp)) {
        options.forEach { (value, label) ->
            FilterChip(
                selected = selected == value,
                onClick = { onSelect(value) },
                label = { Text(label) },
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

/** Not `private` — reused by BrowseDetailScreens.kt's edit-mode fields. */
@Composable
fun FormSwitch(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = LifeosColors.foreground, style = MaterialTheme.typography.bodyMedium)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(checkedTrackColor = LifeosColors.accent, checkedThumbColor = LifeosColors.background),
        )
    }
}

@Composable
fun NewPetScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var species by remember { mutableStateOf("") }
    var breed by remember { mutableStateOf("") }
    var birthDate by remember { mutableStateOf("") }

    CreateScaffold("New Pet", onBack) {
        FormField("Name", name, { name = it })
        FormField("Species", species, { species = it })
        FormField("Breed (optional)", breed, { breed = it })
        FormField("Birth date (YYYY-MM-DD, optional)", birthDate, { birthDate = it })
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Pet",
            color = LifeosColors.accent,
            onClick = { client.createPet(name.trim(), species.trim(), breed.trim().ifBlank { null }, birthDate.trim().ifBlank { null }).toUnitResult() },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewPlantScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var strain by remember { mutableStateOf("") }
    var datePlanted by remember { mutableStateOf("") }
    var stage by remember { mutableStateOf("seedling") }

    CreateScaffold("New Plant", onBack) {
        FormField("Strain", strain, { strain = it })
        FormField("Date planted (YYYY-MM-DD)", datePlanted, { datePlanted = it })
        Text("Stage", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        ChipRow(listOf("seedling" to "Seedling", "veg" to "Veg", "flower" to "Flower", "flush" to "Flush"), stage) { stage = it }
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Plant",
            color = LifeosColors.accent,
            onClick = { client.createPlant(strain.trim(), datePlanted.trim(), stage).toUnitResult() },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewReminderScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var dueDay by remember { mutableStateOf("1") }
    var autopay by remember { mutableStateOf(false) }
    var notes by remember { mutableStateOf("") }

    CreateScaffold("New Reminder", onBack) {
        FormField("Name", name, { name = it })
        FormField("Amount (optional)", amount, { amount = it }, keyboardType = KeyboardType.Decimal)
        FormField("Due day of month (1-31)", dueDay, { dueDay = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
        FormSwitch("Autopay", autopay) { autopay = it }
        FormField("Notes (optional)", notes, { notes = it }, singleLine = false)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Reminder",
            color = LifeosColors.accent,
            onClick = {
                val day = dueDay.toIntOrNull()?.coerceIn(1, 31) ?: 1
                client.createReminder(name.trim(), amount.trim().ifBlank { null }, day, autopay, notes.trim().ifBlank { null }).toUnitResult()
            },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewRoutineScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var recurrenceType by remember { mutableStateOf("interval") }
    var intervalDays by remember { mutableStateOf("30") }
    var weeklyDays by remember { mutableStateOf(setOf<String>()) }
    var monthlyDay by remember { mutableStateOf("1") }

    CreateScaffold("New Routine", onBack) {
        FormField("Name", name, { name = it })
        FormField("Description (optional)", description, { description = it }, singleLine = false)
        FormField("Category (optional)", category, { category = it })
        Text("Repeats", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        ChipRow(listOf("interval" to "Interval", "weekly" to "Weekly", "monthly_day" to "Monthly"), recurrenceType) { recurrenceType = it }
        when (recurrenceType) {
            "interval" -> FormField("Every N days", intervalDays, { intervalDays = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
            "weekly" -> {
                Text("Days of week", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                    listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT").forEach { day ->
                        FilterChip(
                            selected = day in weeklyDays,
                            onClick = { weeklyDays = if (day in weeklyDays) weeklyDays - day else weeklyDays + day },
                            label = { Text(day) },
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
            "monthly_day" -> FormField("Day of month (1-31)", monthlyDay, { monthlyDay = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
        }
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Routine",
            color = LifeosColors.accent,
            onClick = {
                val config = when (recurrenceType) {
                    "interval" -> JSONObject().put("type", "interval").put("days", intervalDays.toIntOrNull() ?: 30)
                    "weekly" -> JSONObject().put("type", "weekly").put("daysOfWeek", org.json.JSONArray(weeklyDays.toList()))
                    else -> JSONObject().put("type", "monthly_day").put("day", monthlyDay.toIntOrNull()?.coerceIn(1, 31) ?: 1)
                }
                client.createRoutine(name.trim(), description.trim().ifBlank { null }, category.trim().ifBlank { null }, recurrenceType, config).toUnitResult()
            },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewNoteScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }

    CreateScaffold("New Note", onBack) {
        FormField("Title (optional)", title, { title = it })
        FormField("Note", body, { body = it }, singleLine = false)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Note",
            color = LifeosColors.accent,
            onClick = { client.createNote(title.trim().ifBlank { null }, body.trim().ifBlank { null }).toUnitResult() },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewListScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var listType by remember { mutableStateOf("general") }

    CreateScaffold("New List", onBack) {
        FormField("Name", name, { name = it })
        Text("Type", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        ChipRow(listOf("general" to "General", "grocery" to "Grocery", "packing" to "Packing", "shopping" to "Shopping"), listType) { listType = it }
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add List",
            color = LifeosColors.accent,
            onClick = { client.createList(name.trim(), listType).toUnitResult() },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewMomentScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    val scope = rememberCoroutineScope()

    var pickedUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var caption by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val pickPhoto = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia(),
    ) { uri -> pickedUri = uri }

    CreateScaffold("New Moment", onBack) {
        com.spooky.lifeos.android.ui.components.LifeCard(
            onClick = { pickPhoto.launch(androidx.activity.result.PickVisualMediaRequest(androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        ) {
            if (pickedUri == null) {
                Text("Tap to choose a photo", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            } else {
                coil3.compose.AsyncImage(
                    model = pickedUri,
                    contentDescription = "Selected photo",
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                )
            }
        }
        FormField("Caption (optional)", caption, { caption = it })
        FormField("Location (optional)", location, { location = it })
        error?.let { Text("Couldn't upload — $it", color = LifeosColors.overdueFg, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp)) }
        Spacer(modifier = Modifier.height(8.dp))
        Button(
            onClick = {
                val uri = pickedUri ?: return@Button
                if (busy) return@Button
                busy = true
                error = null
                scope.launch {
                    val result = withContextIo {
                        val resolver = context.contentResolver
                        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                        val mime = resolver.getType(uri) ?: "image/jpeg"
                        if (bytes == null) {
                            null
                        } else {
                            client.createMoment(bytes, "moment.jpg", mime, caption.trim().ifBlank { null }, location.trim().ifBlank { null })
                        }
                    }
                    when (result) {
                        null -> error = "Couldn't read the selected photo"
                        is ApiResult.Success -> { onCreated(); onBack() }
                        is ApiResult.Failure -> error = result.message
                    }
                    busy = false
                }
            },
            enabled = pickedUri != null && !busy,
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = LifeosColors.accent, contentColor = LifeosColors.background),
        ) {
            if (busy) {
                androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(16.dp), color = LifeosColors.background, strokeWidth = 2.dp)
            } else {
                Text("Add Moment")
            }
        }
    }
}

private suspend fun <T> withContextIo(block: suspend () -> T): T =
    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { block() }

@Composable
fun NewChallengeScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var startDate by remember { mutableStateOf("") }
    var durationDays by remember { mutableStateOf("75") }
    var habitTitles by remember { mutableStateOf("") }

    CreateScaffold("New Challenge", onBack) {
        FormField("Name", name, { name = it })
        FormField("Start date (YYYY-MM-DD)", startDate, { startDate = it })
        FormField("Duration (days)", durationDays, { durationDays = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
        FormField("Habits — one per line", habitTitles, { habitTitles = it }, singleLine = false)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Start Challenge",
            color = LifeosColors.accent,
            onClick = {
                val titles = habitTitles.lines().map { it.trim() }.filter { it.isNotEmpty() }
                if (titles.isEmpty()) {
                    ApiResult.Failure("Add at least one habit")
                } else {
                    client.createChallenge(name.trim(), startDate.trim(), durationDays.toIntOrNull() ?: 75, titles).toUnitResult()
                }
            },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewAccountScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var name by remember { mutableStateOf("") }
    var accountType by remember { mutableStateOf("checking") }
    var institution by remember { mutableStateOf("") }
    var lastFour by remember { mutableStateOf("") }
    var statementCloseDay by remember { mutableStateOf("") }

    CreateScaffold("New Account", onBack) {
        FormField("Name", name, { name = it })
        Text("Type", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        ChipRow(listOf("checking" to "Checking", "savings" to "Savings", "credit_card" to "Credit Card", "loan" to "Loan", "investment" to "Investment"), accountType) { accountType = it }
        FormField("Institution (optional)", institution, { institution = it })
        FormField("Last 4 digits (optional)", lastFour, { lastFour = it.filter(Char::isDigit).take(4) }, keyboardType = KeyboardType.Number)
        FormField("Statement close day 1-31 (optional)", statementCloseDay, { statementCloseDay = it.filter(Char::isDigit) }, keyboardType = KeyboardType.Number)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Account",
            color = LifeosColors.accent,
            onClick = {
                client.createAccount(
                    name.trim(),
                    accountType,
                    institution.trim().ifBlank { null },
                    lastFour.trim().ifBlank { null },
                    statementCloseDay.toIntOrNull()?.coerceIn(1, 31),
                ).toUnitResult()
            },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewFeedScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var feedUrl by remember { mutableStateOf("") }

    CreateScaffold("Add Feed", onBack) {
        FormField("Feed URL", feedUrl, { feedUrl = it })
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Feed",
            color = LifeosColors.accent,
            onClick = { client.createFeedSubscription(feedUrl.trim()).toUnitResult() },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

@Composable
fun NewEventScreen(onBack: () -> Unit, onCreated: () -> Unit) {
    val context = LocalContext.current
    val client = remember { browseClientFor(context) }
    var title by remember { mutableStateOf("") }
    var startAt by remember { mutableStateOf("") }
    var endAt by remember { mutableStateOf("") }
    var allDay by remember { mutableStateOf(false) }
    var location by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    CreateScaffold("New Event", onBack) {
        FormField("Title", title, { title = it })
        FormField("Starts (YYYY-MM-DDTHH:mm)", startAt, { startAt = it })
        FormField("Ends (optional)", endAt, { endAt = it })
        FormSwitch("All day", allDay) { allDay = it }
        FormField("Location (optional)", location, { location = it })
        FormField("Description (optional)", description, { description = it }, singleLine = false)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Add Event",
            color = LifeosColors.accent,
            onClick = {
                client.createEvent(title.trim(), isoFromLocal(startAt.trim()), endAt.trim().ifBlank { null }?.let { isoFromLocal(it) }, allDay, location.trim().ifBlank { null }, description.trim().ifBlank { null })
                    .toUnitResult()
            },
            onSuccess = { onCreated(); onBack() },
        )
    }
}

/** A bare `YYYY-MM-DDTHH:mm` (what the text field asks for) has no timezone/seconds — appending
 *  `:00` gives a value `Instant`-adjacent parsers upstream (zod's `z.coerce.date()`) accept the
 *  same way a `<input type="datetime-local">` value does on the web app's own event form. */
private fun isoFromLocal(local: String): String = if (local.count { it == ':' } == 1) "$local:00" else local

private fun ApiResult<BrowseRow>.toUnitResult(): ApiResult<Unit> = when (this) {
    is ApiResult.Success -> ApiResult.Success(Unit)
    is ApiResult.Failure -> this
}

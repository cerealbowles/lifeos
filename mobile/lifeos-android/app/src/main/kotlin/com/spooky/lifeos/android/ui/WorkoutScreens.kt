package com.spooky.lifeos.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDefaults
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.sync.ApiResult
import com.spooky.lifeos.android.sync.WorkoutsClient
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

private val WORKOUT_TYPE_OPTIONS = listOf("lifting" to "Lifting", "run" to "Run", "walk" to "Walk", "golf" to "Golf")
private val TIME_LABEL_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("h:mm a")
private val TIME_PAYLOAD_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

/**
 * "Log a workout from X pm to Y pm" (direct user request, 2026-08-27) — collects a start and
 * end time since that's how a person actually thinks about a workout they just finished, then
 * converts to the server's `time` (start-of-workout) + `durationMinutes` shape (workouts.ts has
 * no end-time column — see WorkoutsClient's doc comment). Reuses CreateScaffold/FormField/
 * ChipRow/FormSwitch/ActionButton from BrowseCreateScreens.kt rather than a fourth form look.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogWorkoutScreen(onBack: () -> Unit, onLogged: () -> Unit) {
    val context = LocalContext.current
    val client = remember { workoutsClientFor(context) }

    var type by remember { mutableStateOf(WORKOUT_TYPE_OPTIONS.first().first) }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var startTime by remember { mutableStateOf(LocalTime.now().minusHours(1).withSecond(0).withNano(0)) }
    var endTime by remember { mutableStateOf(LocalTime.now().withSecond(0).withNano(0)) }
    var outdoor by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf("") }
    var showStartPicker by remember { mutableStateOf(false) }
    var showEndPicker by remember { mutableStateOf(false) }

    CreateScaffold("Log Workout", onBack) {
        Text("Type", color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        ChipRow(WORKOUT_TYPE_OPTIONS, type) { type = it }
        FormField("Date (YYYY-MM-DD)", date, { date = it })
        Row(modifier = Modifier.fillMaxWidth()) {
            TimeField("Start", startTime, modifier = Modifier.weight(1f)) { showStartPicker = true }
            Spacer(modifier = Modifier.width(12.dp))
            TimeField("End", endTime, modifier = Modifier.weight(1f)) { showEndPicker = true }
        }
        FormSwitch("Outdoor", outdoor) { outdoor = it }
        FormField("Notes (optional)", note, { note = it }, singleLine = false)
        Spacer(modifier = Modifier.height(8.dp))
        ActionButton(
            label = "Log Workout",
            color = LifeosColors.accent,
            onClick = {
                val minutes = minutesBetween(startTime, endTime)
                if (minutes == null) {
                    ApiResult.Failure("End time must be after start time")
                } else {
                    client.createWorkout(type, minutes, date.trim().ifBlank { null }, startTime.format(TIME_PAYLOAD_FORMAT), outdoor, note.trim().ifBlank { null })
                }
            },
            onSuccess = { onLogged(); onBack() },
        )
    }

    if (showStartPicker) {
        WorkoutTimePickerDialog(initial = startTime, onDismiss = { showStartPicker = false }, onConfirm = { startTime = it; showStartPicker = false })
    }
    if (showEndPicker) {
        WorkoutTimePickerDialog(initial = endTime, onDismiss = { showEndPicker = false }, onConfirm = { endTime = it; showEndPicker = false })
    }
}

@Composable
private fun TimeField(label: String, time: LocalTime, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(modifier = modifier.padding(bottom = 12.dp)) {
        Text(label, color = LifeosColors.mutedFg, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 6.dp))
        OutlinedButton(
            onClick = onClick,
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, LifeosColors.glassBorder),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = LifeosColors.foreground),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(time.format(TIME_LABEL_FORMAT))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutTimePickerDialog(initial: LocalTime, onDismiss: () -> Unit, onConfirm: (LocalTime) -> Unit) {
    val state = rememberTimePickerState(initialHour = initial.hour, initialMinute = initial.minute, is24Hour = false)
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(20.dp), color = LifeosColors.glassSurface) {
            Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                TimePicker(
                    state = state,
                    colors = TimePickerDefaults.colors(
                        selectorColor = LifeosColors.accent,
                        containerColor = LifeosColors.background,
                        periodSelectorSelectedContainerColor = LifeosColors.accent,
                        timeSelectorSelectedContainerColor = LifeosColors.accent,
                        timeSelectorSelectedContentColor = LifeosColors.background,
                    ),
                )
                Row(modifier = Modifier.padding(top = 12.dp)) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    TextButton(onClick = { onConfirm(LocalTime.of(state.hour, state.minute)) }) { Text("OK") }
                }
            }
        }
    }
}

/** `null` when the range is empty or exceeds a day, matching the server's `durationMinutes`
 *  bounds (1-1440, see app/api/workouts/route.ts's zod schema). Workouts don't cross midnight
 *  in this form (start/end are both "today's" times), so no wraparound handling. */
private fun minutesBetween(start: LocalTime, end: LocalTime): Int? {
    val minutes = ChronoUnit.MINUTES.between(start, end).toInt()
    return minutes.takeIf { it in 1..1440 }
}

private fun workoutsClientFor(context: android.content.Context): WorkoutsClient {
    val config = LifeosConfig(context)
    return WorkoutsClient(config.getBaseUrl() ?: "", config.getToken() ?: "")
}

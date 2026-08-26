package com.spooky.lifeos.android.ui

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spooky.lifeos.android.db.LocalTask
import com.spooky.lifeos.android.sync.TasksRepository
import com.spooky.lifeos.android.sync.TasksSyncWorker
import kotlinx.coroutines.launch

/**
 * Native Tasks — the write-side half of the offline-reliability goal that Today (read-only)
 * didn't cover. Deliberately minimal for v1: quick-capture (title + optional priority), swipe
 * to complete, tap to delete. No due-date picker, no description, no editing yet — the web app
 * already covers the fuller form; this is the "capture it before I forget, from my phone"
 * fast path, matching CLAUDE.md's "smallest coherent increment" guidance.
 */
@Composable
fun TasksScreen() {
    val context = LocalContext.current
    val repo = remember { TasksRepository(context) }
    val scope = rememberCoroutineScope()

    var tasks by remember { mutableStateOf(repo.listOpen()) }
    var pendingCount by remember { mutableStateOf(repo.pendingOpCount()) }
    var newTitle by remember { mutableStateOf("") }
    var newPriority by remember { mutableStateOf<String?>(null) }
    var syncing by remember { mutableStateOf(false) }

    fun refreshLocal() {
        tasks = repo.listOpen()
        pendingCount = repo.pendingOpCount()
    }

    fun sync() {
        syncing = true
        scope.launch {
            repo.syncNow()
            refreshLocal()
            syncing = false
        }
    }

    LaunchedEffect(Unit) {
        sync()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Tasks", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = LifeosColors.foreground)
                if (pendingCount > 0) {
                    if (syncing) {
                        Text("Syncing…", style = MaterialTheme.typography.bodySmall, color = LifeosColors.dueSoonFg)
                    } else {
                        com.spooky.lifeos.android.ui.motion.AnimatedInt(
                            value = pendingCount,
                            format = { "$it pending" },
                            style = MaterialTheme.typography.bodySmall,
                            color = LifeosColors.dueSoonFg,
                        )
                    }
                }
            }
        }

        // Quick-capture row — wrapped in the same rounded "field journal" card treatment as
        // every other surface now (was a bare default-Material OutlinedTextField), with colors
        // pinned explicitly to the earth palette rather than relying on the color scheme's
        // generic outline/primary mapping to happen to look right.
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = newTitle,
                onValueChange = { newTitle = it },
                placeholder = { Text("Add a task…", color = LifeosColors.mutedFg) },
                singleLine = true,
                shape = RoundedCornerShape(18.dp),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LifeosColors.accent,
                    unfocusedBorderColor = LifeosColors.glassBorder,
                    focusedTextColor = LifeosColors.foreground,
                    unfocusedTextColor = LifeosColors.foreground,
                    cursorColor = LifeosColors.accent,
                    focusedContainerColor = LifeosColors.glassSurface,
                    unfocusedContainerColor = LifeosColors.glassSurface,
                ),
                modifier = Modifier.weight(1f),
            )
            IconButton(
                enabled = newTitle.isNotBlank(),
                onClick = {
                    repo.createTask(newTitle.trim(), null, null, newPriority, null)
                    newTitle = ""
                    newPriority = null
                    refreshLocal()
                    TasksSyncWorker.runNow(context)
                    sync()
                },
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add task", tint = LifeosColors.accent)
            }
        }

        if (tasks.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("No open tasks. Nice.", color = LifeosColors.mutedFg, style = MaterialTheme.typography.bodyMedium)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 16.dp),
            ) {
                items(tasks, key = { it.id }) { task ->
                    if (task.synced) {
                        SwipeToCompleteRow(
                            onComplete = {
                                repo.completeTask(task)
                                refreshLocal()
                                TasksSyncWorker.runNow(context)
                                true // local-first write — always "succeeds" from the swipe's point of view
                            },
                        ) {
                            TaskRow(task, onDelete = {
                                repo.deleteTask(task)
                                refreshLocal()
                                TasksSyncWorker.runNow(context)
                            })
                        }
                    } else {
                        TaskRow(task, onDelete = {
                            repo.deleteTask(task)
                            refreshLocal()
                        })
                    }
                }
            }
        }
    }
}

@Composable
private fun TaskRow(task: LocalTask, onDelete: () -> Unit) {
    com.spooky.lifeos.android.ui.components.LifeCard(contentPadding = 0.dp) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PriorityDot(task.priority)
            Column(modifier = Modifier.weight(1f)) {
                Text(task.title, style = MaterialTheme.typography.bodyMedium, color = LifeosColors.foreground)
                if (!task.synced) {
                    Text("Syncing…", style = MaterialTheme.typography.bodySmall, color = LifeosColors.mutedFg)
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = LifeosColors.mutedFg)
            }
        }
    }
}

@Composable
private fun PriorityDot(priority: String?) {
    val color = when (priority) {
        "high" -> LifeosColors.overdueFg
        "medium" -> LifeosColors.dueSoonFg
        else -> LifeosColors.mutedFg
    }
    Box(modifier = Modifier.size(10.dp).background(color, CircleShape))
}

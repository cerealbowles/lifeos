package com.spooky.lifeos.android.sync

import android.content.Context
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.db.LocalTask
import com.spooky.lifeos.android.db.TasksDb
import org.json.JSONObject

/**
 * The write-side offline pattern the plan called for: every mutation applies to the local
 * `TasksDb` immediately (so the UI reflects it with zero latency, online or not) and is mirrored
 * into the outbox; `syncNow()` — called on app foreground, pull-to-refresh, and the periodic
 * worker — replays the outbox in order, then refreshes from the server once it's empty.
 *
 * Kept as one class (not split further) because the local-state mutation and the outbox
 * enqueue must always happen together, atomically from the caller's point of view — splitting
 * them across two objects would just invite a caller to do one without the other.
 */
class TasksRepository(context: Context) {
    private val db = TasksDb(context)
    private val config = LifeosConfig(context)

    fun listOpen(): List<LocalTask> = db.listOpen()

    fun createTask(title: String, description: String?, dueAtMs: Long?, priority: String?, category: String?): LocalTask {
        val task = db.insertLocalTask(title, description, dueAtMs, priority, category)
        val payload = JSONObject().apply {
            put("title", title)
            description?.let { put("description", it) }
            dueAtMs?.let { put("dueAt", java.time.Instant.ofEpochMilli(it).toString()) }
            priority?.let { put("priority", it) }
            category?.let { put("category", it) }
        }
        db.enqueueOp("create", task.id, payload.toString())
        return task
    }

    /** No-op (silently) for a task that isn't synced yet — see TasksDb's class doc. */
    fun completeTask(task: LocalTask) {
        if (!task.synced) return
        db.markDoneLocally(task.id)
        db.enqueueOp("complete", task.id)
    }

    /** Deleting a never-synced task just cancels its pending create — no network call at all. */
    fun deleteTask(task: LocalTask) {
        db.deleteLocally(task.id)
        if (task.synced) {
            db.enqueueOp("delete", task.id)
        } else {
            db.cancelCreateOp(task.id)
        }
    }

    fun pendingOpCount(): Int = db.pendingOpCount()

    /**
     * Replays the outbox oldest-first, stopping at the first network failure (preserves order —
     * a later op for the same task must never race ahead of an earlier one). Returns true if the
     * outbox fully drained, in which case it's safe to refresh from the server; a partial drain
     * leaves local state as the most current copy, so no server refresh happens that round.
     */
    suspend fun syncNow(): SyncOutcome {
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return SyncOutcome.NotLoggedIn
        val client = TasksClient(baseUrl, token)

        for (op in db.listOps()) {
            val outcome = when (op.opType) {
                "create" -> replayCreate(client, op)
                "complete" -> replayComplete(client, op)
                "delete" -> replayDelete(client, op)
                else -> true // unknown op type — drop it rather than jam the queue forever
            }
            if (!outcome) return SyncOutcome.PartialFailure
            db.deleteOp(op.opId)
        }

        return when (val result = client.listTasks()) {
            is ApiResult.Success -> {
                db.replaceServerTasks(result.value)
                SyncOutcome.Success
            }
            is ApiResult.Failure -> SyncOutcome.PartialFailure // outbox drained but the refresh itself failed
        }
    }

    private suspend fun replayCreate(client: TasksClient, op: com.spooky.lifeos.android.db.TaskOp): Boolean {
        val payload = op.payload?.let { JSONObject(it) } ?: return true // malformed — drop rather than loop forever
        val result = client.createTask(
            title = payload.getString("title"),
            description = payload.optString("description").takeIf { payload.has("description") },
            dueAtMs = payload.optString("dueAt").takeIf { payload.has("dueAt") }?.let { java.time.Instant.parse(it).toEpochMilli() },
            priority = payload.optString("priority").takeIf { payload.has("priority") },
            category = payload.optString("category").takeIf { payload.has("category") },
        )
        return when (result) {
            is ApiResult.Success -> {
                db.replaceLocalId(op.taskId, result.value.id)
                true
            }
            is ApiResult.Failure -> false
        }
    }

    private suspend fun replayComplete(client: TasksClient, op: com.spooky.lifeos.android.db.TaskOp): Boolean =
        when (val result = client.completeTask(op.taskId)) {
            is ApiResult.Success -> true
            is ApiResult.Failure -> result.notFound // already gone server-side — fine, stop retrying
        }

    private suspend fun replayDelete(client: TasksClient, op: com.spooky.lifeos.android.db.TaskOp): Boolean =
        when (val result = client.deleteTask(op.taskId)) {
            is ApiResult.Success -> true
            is ApiResult.Failure -> result.notFound
        }
}

sealed class SyncOutcome {
    object Success : SyncOutcome()
    object PartialFailure : SyncOutcome()
    object NotLoggedIn : SyncOutcome()
}

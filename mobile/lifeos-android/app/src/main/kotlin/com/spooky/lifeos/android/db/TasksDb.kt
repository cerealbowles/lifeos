package com.spooky.lifeos.android.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.util.UUID

/** A locally-cached task — either a server-confirmed row or one still waiting to sync. */
data class LocalTask(
    val id: String,
    val title: String,
    val description: String?,
    val dueAtMs: Long?,
    val priority: String?, // low | medium | high
    val category: String?,
    val status: String, // todo | done
    val synced: Boolean, // false = created offline, not yet confirmed by the server
)

/** One queued mutation waiting to reach the server — the write-side offline queue. */
data class TaskOp(val opId: Long, val opType: String, val taskId: String, val payload: String?)

/**
 * Local Tasks cache + outbox — plain SQLiteOpenHelper (same reasoning as TodayCache/whoop-bridge's
 * LocalDb: no Room/KSP version-pinning risk for two small tables). Unlike TodayCache (a read-only
 * blob), this is the write-side half of the original offline-reliability goal: create/complete/
 * delete are applied to `tasks` immediately (optimistic, so the UI never waits on the network),
 * and mirrored into `task_ops` so a background sync can replay them once connectivity returns.
 *
 * Deliberately restricted for v1: complete/delete only enqueue a network op for tasks that already
 * have a real server id (`synced = 1`). A task created offline (`synced = 0`) can only be edited
 * locally or deleted outright (which just cancels its pending create — no network call needed at
 * all); it can't be swipe-completed until its create has actually reached the server. This avoids
 * needing to resolve a local-id-to-server-id mapping mid-queue, at the cost of a brief "Syncing…"
 * window right after creating a task — judged a reasonable v1 trade rather than a real limitation.
 */
class TasksDb(context: Context) : SQLiteOpenHelper(context, "lifeos_tasks.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                due_at INTEGER,
                priority TEXT,
                category TEXT,
                status TEXT NOT NULL,
                synced INTEGER NOT NULL DEFAULT 1
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE task_ops (
                op_id INTEGER PRIMARY KEY AUTOINCREMENT,
                op_type TEXT NOT NULL,
                task_id TEXT NOT NULL,
                payload TEXT,
                created_at INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // No prior version to migrate from yet.
    }

    // --- Reads -----------------------------------------------------------------------------

    /** Open tasks (status = todo), most-recently-created first. Done tasks aren't shown — this
     *  is a quick-capture list, not a full history browser; the web app already owns that. */
    fun listOpen(): List<LocalTask> {
        readableDatabase.rawQuery(
            "SELECT * FROM tasks WHERE status = 'todo' ORDER BY rowid DESC",
            null,
        ).use { cursor ->
            val out = mutableListOf<LocalTask>()
            while (cursor.moveToNext()) out.add(cursor.toLocalTask())
            return out
        }
    }

    fun pendingOpCount(): Int {
        readableDatabase.rawQuery("SELECT COUNT(*) FROM task_ops", null).use { cursor ->
            cursor.moveToFirst()
            return cursor.getInt(0)
        }
    }

    // --- Writes (called from the repository, always paired with an outbox op where relevant) --

    /** Overwrites every server-confirmed row with a fresh GET /api/tasks response. Local-only
     *  (unsynced) rows are left untouched — they're not in the server's response yet. */
    fun replaceServerTasks(serverTasks: List<LocalTask>) {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.delete("tasks", "synced = 1", null)
            for (t in serverTasks) insertOrReplace(t.copy(synced = true))
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun insertLocalTask(title: String, description: String?, dueAtMs: Long?, priority: String?, category: String?): LocalTask {
        val task = LocalTask(
            id = "local-${UUID.randomUUID()}",
            title = title,
            description = description,
            dueAtMs = dueAtMs,
            priority = priority,
            category = category,
            status = "todo",
            synced = false,
        )
        insertOrReplace(task)
        return task
    }

    fun markDoneLocally(id: String) {
        writableDatabase.execSQL("UPDATE tasks SET status = 'done' WHERE id = ?", arrayOf(id))
    }

    fun deleteLocally(id: String) {
        writableDatabase.delete("tasks", "id = ?", arrayOf(id))
    }

    fun replaceLocalId(oldId: String, newId: String) {
        writableDatabase.execSQL("UPDATE tasks SET id = ?, synced = 1 WHERE id = ?", arrayOf(newId, oldId))
    }

    private fun insertOrReplace(t: LocalTask) {
        val values = ContentValues().apply {
            put("id", t.id)
            put("title", t.title)
            put("description", t.description)
            put("due_at", t.dueAtMs)
            put("priority", t.priority)
            put("category", t.category)
            put("status", t.status)
            put("synced", if (t.synced) 1 else 0)
        }
        writableDatabase.insertWithOnConflict("tasks", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // --- Outbox ------------------------------------------------------------------------------

    fun enqueueOp(opType: String, taskId: String, payload: String? = null) {
        val values = ContentValues().apply {
            put("op_type", opType)
            put("task_id", taskId)
            put("payload", payload)
            put("created_at", System.currentTimeMillis())
        }
        writableDatabase.insert("task_ops", null, values)
    }

    /** Cancels a still-queued create op — used when a never-synced local task is deleted before
     *  it ever reached the server, so no network call happens for it at all. */
    fun cancelCreateOp(taskId: String) {
        writableDatabase.delete("task_ops", "op_type = 'create' AND task_id = ?", arrayOf(taskId))
    }

    fun listOps(): List<TaskOp> {
        readableDatabase.rawQuery("SELECT * FROM task_ops ORDER BY op_id ASC", null).use { cursor ->
            val out = mutableListOf<TaskOp>()
            while (cursor.moveToNext()) {
                out.add(
                    TaskOp(
                        opId = cursor.getLong(cursor.getColumnIndexOrThrow("op_id")),
                        opType = cursor.getString(cursor.getColumnIndexOrThrow("op_type")),
                        taskId = cursor.getString(cursor.getColumnIndexOrThrow("task_id")),
                        payload = cursor.getStringOrNull("payload"),
                    ),
                )
            }
            return out
        }
    }

    fun deleteOp(opId: Long) {
        writableDatabase.delete("task_ops", "op_id = ?", arrayOf(opId.toString()))
    }

    private fun android.database.Cursor.toLocalTask(): LocalTask = LocalTask(
        id = getString(getColumnIndexOrThrow("id")),
        title = getString(getColumnIndexOrThrow("title")),
        description = getStringOrNull("description"),
        dueAtMs = if (isNull(getColumnIndexOrThrow("due_at"))) null else getLong(getColumnIndexOrThrow("due_at")),
        priority = getStringOrNull("priority"),
        category = getStringOrNull("category"),
        status = getString(getColumnIndexOrThrow("status")),
        synced = getInt(getColumnIndexOrThrow("synced")) == 1,
    )

    private fun android.database.Cursor.getStringOrNull(col: String): String? {
        val idx = getColumnIndexOrThrow(col)
        return if (isNull(idx)) null else getString(idx)
    }
}

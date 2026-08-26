package com.spooky.lifeos.android.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * Local cache of the last-fetched GET /api/today response — plain SQLiteOpenHelper, same
 * reasoning as mobile/whoop-bridge's LocalDb (no Room/KSP version-pinning risk for what's
 * structurally a single cached blob + timestamp). v1 is read-only: cache the server's
 * already-fully-ranked JSON as-is (lib/today/ranking.ts does the ranking server-side,
 * confirmed unit-tested and deterministic) rather than parsing into a normalized local
 * schema — there's nothing to reconcile yet since nothing is written back. Revisit if/when
 * an offline-write domain (Tasks) is added.
 */
class TodayCache(context: Context) : SQLiteOpenHelper(context, "lifeos_today_cache.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE today_cache (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                json_text TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // No prior version to migrate from yet.
    }

    fun save(jsonText: String, fetchedAtMs: Long = System.currentTimeMillis()) {
        val values = ContentValues().apply {
            put("id", 1)
            put("json_text", jsonText)
            put("fetched_at", fetchedAtMs)
        }
        writableDatabase.insertWithOnConflict("today_cache", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    /** The last cached response, or null if never fetched successfully. */
    fun load(): CachedToday? {
        readableDatabase.rawQuery("SELECT json_text, fetched_at FROM today_cache WHERE id = 1", null).use { cursor ->
            if (!cursor.moveToFirst()) return null
            return CachedToday(
                jsonText = cursor.getString(cursor.getColumnIndexOrThrow("json_text")),
                fetchedAtMs = cursor.getLong(cursor.getColumnIndexOrThrow("fetched_at")),
            )
        }
    }
}

data class CachedToday(val jsonText: String, val fetchedAtMs: Long)

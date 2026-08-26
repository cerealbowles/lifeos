package com.spooky.lifeos.whoopbridge.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local-only storage — same two-table shape as the (now-deleted) Flutter build's
 * sqflite schema: raw decoded samples (for building the JSON batches LifeOS
 * expects) and a pending-upload queue (since LifeOS is only reachable over
 * Tailscale, a batch stays queued until a POST actually succeeds).
 */
class LocalDb(context: Context) : SQLiteOpenHelper(context, "whoop_bridge.db", null, 2) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE raw_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts_sec INTEGER NOT NULL,
                hr REAL,
                rr_ms TEXT,
                gen TEXT NOT NULL,
                skin_temp_c REAL,
                sleep_state TEXT
            )
            """.trimIndent(),
        )
        db.execSQL("CREATE INDEX idx_raw_samples_ts ON raw_samples(ts_sec)")
        db.execSQL(
            """
            CREATE TABLE pending_uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload_json TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // v1 -> v2: skin temp and sleep state were always decoded off the strap but thrown
        // away right after — found live going through what else the protocol already gives
        // us. Real ALTER TABLE, not a drop/recreate: raw_samples holds genuine irreplaceable
        // history (160k+ rows at the time this was written).
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE raw_samples ADD COLUMN skin_temp_c REAL")
            db.execSQL("ALTER TABLE raw_samples ADD COLUMN sleep_state TEXT")
        }
    }

    fun insertSample(tsSec: Long, hr: Int?, rrMs: List<Int>, gen: String, skinTempC: Double? = null, sleepState: String? = null) {
        val values = ContentValues().apply {
            put("ts_sec", tsSec)
            if (hr != null) put("hr", hr) else putNull("hr")
            put("rr_ms", JSONArray(rrMs).toString())
            put("gen", gen)
            if (skinTempC != null) put("skin_temp_c", skinTempC) else putNull("skin_temp_c")
            if (sleepState != null) put("sleep_state", sleepState) else putNull("sleep_state")
        }
        writableDatabase.insert("raw_samples", null, values)
    }

    /** Samples in [sinceSec, untilSec], oldest first. */
    fun samplesInRange(sinceSec: Long, untilSec: Long): List<RawSample> {
        val out = ArrayList<RawSample>()
        readableDatabase.rawQuery(
            "SELECT ts_sec, hr, rr_ms, gen, skin_temp_c, sleep_state FROM raw_samples WHERE ts_sec >= ? AND ts_sec <= ? ORDER BY ts_sec ASC",
            arrayOf(sinceSec.toString(), untilSec.toString()),
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val hrIdx = cursor.getColumnIndexOrThrow("hr")
                val hr = if (cursor.isNull(hrIdx)) null else cursor.getInt(hrIdx)
                val rrJson = cursor.getString(cursor.getColumnIndexOrThrow("rr_ms"))
                val rrArray = JSONArray(rrJson)
                val rr = (0 until rrArray.length()).map { rrArray.getInt(it) }
                val skinTempIdx = cursor.getColumnIndexOrThrow("skin_temp_c")
                val skinTempC = if (cursor.isNull(skinTempIdx)) null else cursor.getDouble(skinTempIdx)
                val sleepStateIdx = cursor.getColumnIndexOrThrow("sleep_state")
                val sleepState = if (cursor.isNull(sleepStateIdx)) null else cursor.getString(sleepStateIdx)
                out.add(
                    RawSample(
                        tsSec = cursor.getLong(cursor.getColumnIndexOrThrow("ts_sec")),
                        hr = hr,
                        rrMs = rr,
                        gen = cursor.getString(cursor.getColumnIndexOrThrow("gen")),
                        skinTempC = skinTempC,
                        sleepState = sleepState,
                    ),
                )
            }
        }
        return out
    }

    /**
     * Most recent sample timestamp actually present, or null if empty. A first sync
     * (or any sync after a gap) drains the strap's own backlog — those records carry
     * REAL PAST timestamps from when the strap recorded them, not close to wall-clock
     * "now." Deriving against `System.currentTimeMillis()` silently misses all of it
     * (found live: a real drain decoded hundreds of valid samples but derived 0
     * readings, because none fell within an hour of wall-clock now). Anchor derive
     * windows on this instead.
     */
    fun latestSampleSec(): Long? {
        readableDatabase.rawQuery("SELECT MAX(ts_sec) as m FROM raw_samples", null).use { cursor ->
            if (cursor.moveToFirst() && !cursor.isNull(0)) return cursor.getLong(0)
        }
        return null
    }

    fun pruneOlderThan(keepDays: Int) {
        val cutoff = (System.currentTimeMillis() / 1000) - keepDays * 24L * 3600L
        writableDatabase.delete("raw_samples", "ts_sec < ?", arrayOf(cutoff.toString()))
    }

    fun enqueueUpload(readings: JSONArray, sleepSegments: JSONArray = JSONArray()) {
        val payload = JSONObject().put("readings", readings).put("sleepSegments", sleepSegments)
        val values = ContentValues().apply {
            put("payload_json", payload.toString())
            put("created_at", System.currentTimeMillis())
        }
        writableDatabase.insert("pending_uploads", null, values)
    }

    fun pendingUploads(): List<PendingUpload> {
        val out = ArrayList<PendingUpload>()
        readableDatabase.rawQuery(
            "SELECT id, payload_json FROM pending_uploads ORDER BY created_at ASC",
            null,
        ).use { cursor ->
            while (cursor.moveToNext()) {
                out.add(
                    PendingUpload(
                        id = cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                        payloadJson = cursor.getString(cursor.getColumnIndexOrThrow("payload_json")),
                    ),
                )
            }
        }
        return out
    }

    fun deleteUpload(id: Long) {
        writableDatabase.delete("pending_uploads", "id = ?", arrayOf(id.toString()))
    }
}

data class RawSample(
    val tsSec: Long,
    val hr: Int?,
    val rrMs: List<Int>,
    val gen: String,
    val skinTempC: Double? = null,
    val sleepState: String? = null,
)
data class PendingUpload(val id: Long, val payloadJson: String)

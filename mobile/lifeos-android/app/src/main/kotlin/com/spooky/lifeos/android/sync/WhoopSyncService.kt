package com.spooky.lifeos.android.sync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.MainActivity
import com.spooky.lifeos.android.R
import com.spooky.lifeos.android.ble.StrapScanner
import com.spooky.lifeos.android.ble.WhoopBleManager
import com.spooky.lifeos.android.db.WhoopLocalDb
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * LifeOS's own connection to the Whoop strap — ported in from the now-retired
 * mobile/whoop-bridge companion app, which proved this out standalone first. Holds one BLE
 * connection open for as long as the service runs, so realtime notifications
 * (PacketType.REALTIME_DATA — WhoopBleManager already handles these identically to
 * HISTORICAL_DATA) stream in continuously rather than only being collected during a brief
 * periodic window. whoop-bridge also had a lighter periodic WorkManager mode (connect,
 * drain, disconnect every ~15 min); that mode wasn't ported — this held-open connection is
 * the only one now, since it's what was actually verified working end-to-end. Costs a
 * permanent notification and more battery than a periodic sync would; opt-in via the
 * Settings toggle, not started automatically just by being logged in.
 *
 * Reconnection is a plain poll loop off WhoopBleManager.isLinkActive, not a full
 * ConnectionObserver — see that flag's own doc for why.
 */
class WhoopSyncService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var db: WhoopLocalDb
    private lateinit var config: LifeosConfig
    private lateinit var uploader: WhoopUploader
    private lateinit var notificationManager: NotificationManager

    @Volatile
    private var running = false

    override fun onCreate() {
        super.onCreate()
        db = WhoopLocalDb(this)
        config = LifeosConfig(this)
        uploader = WhoopUploader(config, db) { log(it) }
        notificationManager = getSystemService(NotificationManager::class.java)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildNotification("Starting…"),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
        )
        if (!running) {
            running = true
            scope.launch { runLoop() }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        running = false
        scope.cancel()
        super.onDestroy()
    }

    private suspend fun runLoop() {
        if (!config.isLoggedIn()) {
            updateNotification("Sign in to LifeOS first.")
            return
        }
        while (running) {
            try {
                connectAndHold()
            } catch (e: Exception) {
                log("Foreground sync error: ${e::class.simpleName}: ${e.message}")
            }
            if (running) {
                updateNotification("Reconnecting…")
                delay(RECONNECT_DELAY_MS)
            }
        }
    }

    private suspend fun connectAndHold() {
        updateNotification("Scanning for strap…")
        val found = StrapScanner(this).scanForStrap()
        if (found == null) {
            updateNotification("No strap found nearby.")
            return
        }
        val (device, type) = found
        val manager = WhoopBleManager(this, type, db) { log(it) }
        // Connecting immediately after stopScan() is a known Android BLE timeout gotcha
        // (status=8, "Connection Timeout") — give the radio a moment first.
        delay(300)
        connectSuspend(manager, device)
        updateNotification("Connected — running sync handshake…")
        manager.runSyncHandshake()

        try {
            var lastDeriveAtMs = 0L
            while (running && manager.isLinkActive) {
                val now = System.currentTimeMillis()
                if (now - lastDeriveAtMs >= DERIVE_INTERVAL_MS) {
                    deriveAndUpload()
                    lastDeriveAtMs = now
                }
                delay(LINK_CHECK_INTERVAL_MS)
            }
        } finally {
            disconnectSuspend(manager)
        }
    }

    private suspend fun deriveAndUpload() {
        db.pruneOlderThan(60)
        val readings = DailyDerive.deriveForNow(db)
        val sleepSegments = SleepDerive.deriveSegments(db)
        db.latestSampleSec()?.let { db.setLastDerivedSec(it) }
        if (readings.length() > 0 || sleepSegments.length() > 0) {
            db.enqueueUpload(readings, sleepSegments)
        }
        log("Derived ${readings.length()} reading(s), ${sleepSegments.length()} sleep segment(s).")
        val uploaded = uploader.drainPendingUploads()
        val timestamp = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())
        updateNotification("Connected — last synced $timestamp ($uploaded batch(es) uploaded)")
    }

    private fun log(message: String) {
        android.util.Log.i("LifeosSync", message)
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(CHANNEL_ID, "Whoop background sync", NotificationManager.IMPORTANCE_LOW)
        channel.description = "Keeps a live connection to your Whoop strap for near-real-time syncing."
        notificationManager.createNotificationChannel(channel)
    }

    private fun buildNotification(status: String): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("LifeOS · Whoop sync")
            .setContentText(status)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(openApp)
            .build()
    }

    private fun updateNotification(status: String) {
        log(status)
        if (!scope.isActive) return // straggler call right as onDestroy tore the service down
        notificationManager.notify(NOTIFICATION_ID, buildNotification(status))
    }

    companion object {
        private const val CHANNEL_ID = "whoop_sync"
        private const val NOTIFICATION_ID = 1
        private const val LINK_CHECK_INTERVAL_MS = 30_000L
        // Matches Derive.HR_BUCKET_SECONDS (60s) — heart rate is reported ~every second with
        // no filtering needed, so there's no reason to sit on a fresh bucket for 10 minutes
        // before uploading it once the connection is already held open continuously anyway.
        // HRV still needs several minutes of RR samples to be reliable (see Derive.kt), but
        // it's computed as a rolling trailing window each call, so it benefits from the
        // tighter interval too instead of being tied to how often HR happens to update.
        private const val DERIVE_INTERVAL_MS = 60 * 1000L
        private const val RECONNECT_DELAY_MS = 10_000L
    }
}

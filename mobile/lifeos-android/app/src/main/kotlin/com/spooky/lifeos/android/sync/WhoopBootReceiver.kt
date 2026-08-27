package com.spooky.lifeos.android.sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.spooky.lifeos.android.LifeosConfig

/**
 * A held-open BLE connection doesn't survive a reboot on its own, and unlike WorkManager's
 * periodic workers (TodayRefreshWorker/TasksSyncWorker — WorkManager re-registers its own
 * boot receiver internally for those), WhoopSyncService won't restart itself without an
 * explicit signal. Ported in from mobile/whoop-bridge (now retired), same reasoning.
 */
class WhoopBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val config = LifeosConfig(context)
        if (!config.isWhoopSyncEnabled() || !config.isLoggedIn()) return
        ContextCompat.startForegroundService(context, Intent(context, WhoopSyncService::class.java))
    }
}

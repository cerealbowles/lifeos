package com.spooky.lifeos.whoopbridge.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.Constraints
import java.util.concurrent.TimeUnit

const val SYNC_WORK_NAME = "whoop_bridge_sync"

/**
 * Periodic background sync: connect -> drain the strap -> derive readings ->
 * upload. Same ~15 min cadence as the (now-deleted) Flutter build's workmanager
 * task (also WorkManager's own floor for periodic work).
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            SyncOrchestrator(applicationContext) { message ->
                android.util.Log.i("WhoopBridgeSync", message)
            }.runOnce()
            Result.success()
        } catch (e: Exception) {
            android.util.Log.w("WhoopBridgeSync", "Background sync failed: ${e.message}")
            Result.retry()
        }
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.NOT_REQUIRED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(SYNC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}

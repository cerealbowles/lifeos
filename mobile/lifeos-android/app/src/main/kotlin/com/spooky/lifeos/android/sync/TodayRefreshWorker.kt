package com.spooky.lifeos.android.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.spooky.lifeos.android.LifeosConfig
import com.spooky.lifeos.android.db.TodayCache
import java.util.concurrent.TimeUnit

const val TODAY_REFRESH_WORK_NAME = "lifeos_today_refresh"

/**
 * Periodic background refresh of the Today cache — same ~15 min floor/rationale as
 * mobile/whoop-bridge's SyncWorker. A failed fetch leaves the last-cached response in
 * place (TodayCache.save is only called on success) rather than clearing it — never blank
 * on a failed background sync, per the plan's own verification step.
 */
class TodayRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val config = LifeosConfig(applicationContext)
        val baseUrl = config.getBaseUrl()
        val token = config.getToken()
        if (baseUrl == null || token == null) return Result.success() // not logged in yet — nothing to do

        return when (val result = TodayClient(baseUrl, token).fetchToday()) {
            is TodayFetchResult.Success -> {
                android.util.Log.i("LifeosSync", "Background refresh OK.")
                TodayCache(applicationContext).save(result.jsonText)
                Result.success()
            }
            is TodayFetchResult.Failure -> {
                android.util.Log.w("LifeosSync", "Background refresh failed: ${result.message}")
                Result.retry()
            }
        }
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<TodayRefreshWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(TODAY_REFRESH_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}

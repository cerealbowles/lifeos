package com.spooky.lifeos.android.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

const val TASKS_SYNC_WORK_NAME = "lifeos_tasks_sync"
const val TASKS_SYNC_ONE_TIME_WORK_NAME = "lifeos_tasks_sync_now"

/**
 * Drains the Tasks outbox in the background — same ~15 min periodic floor as TodayRefreshWorker,
 * plus `runNow()` for an immediate attempt right after a create/complete/delete so a task doesn't
 * sit queued for up to 15 minutes when the phone is actually online the whole time.
 */
class TasksSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val repo = TasksRepository(applicationContext)
        return when (repo.syncNow()) {
            SyncOutcome.Success -> {
                android.util.Log.i("LifeosSync", "Tasks sync OK.")
                Result.success()
            }
            SyncOutcome.PartialFailure -> {
                android.util.Log.w("LifeosSync", "Tasks sync incomplete — will retry.")
                Result.retry()
            }
            SyncOutcome.NotLoggedIn -> Result.success()
        }
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<TasksSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(TASKS_SYNC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        /** Fire-and-forget immediate attempt — called right after a local mutation. */
        fun runNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<TasksSyncWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                TASKS_SYNC_ONE_TIME_WORK_NAME,
                androidx.work.ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}

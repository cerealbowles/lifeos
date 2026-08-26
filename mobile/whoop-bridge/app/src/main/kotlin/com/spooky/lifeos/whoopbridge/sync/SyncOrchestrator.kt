package com.spooky.lifeos.whoopbridge.sync

import android.bluetooth.BluetoothDevice
import android.content.Context
import com.spooky.lifeos.whoopbridge.LifeosConfig
import com.spooky.lifeos.whoopbridge.ble.StrapScanner
import com.spooky.lifeos.whoopbridge.ble.WhoopBleManager
import com.spooky.lifeos.whoopbridge.db.LocalDb
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Bridges Nordic BleManager's classic `.done{}/.fail{}/.enqueue()` request API to a
 * suspend function — deliberately not relying on ble-ktx's `.suspend()` extension,
 * whose exact current API surface wasn't independently verified (unlike the rest of
 * this app), so it's safer to write the coroutine bridge directly against the
 * long-stable callback API than to guess an extension function's name/package.
 *
 * `.retry(3, 300)` — status=8 (Bluetooth HCI "Connection Timeout") on the first real
 * pairing attempt against physical hardware. A well-known Android BLE gotcha, not a
 * protocol bug: a single connect attempt made right after a scan stops is prone to
 * exactly this timeout. Retrying with a short backoff is the standard fix.
 */
private suspend fun connectSuspend(manager: WhoopBleManager, device: BluetoothDevice) =
    suspendCancellableCoroutine<Unit> { cont ->
        manager.connect(device)
            .useAutoConnect(false)
            .retry(3, 300)
            .timeout(20_000)
            .done { if (cont.isActive) cont.resume(Unit) }
            .fail { _, status -> if (cont.isActive) cont.resumeWithException(RuntimeException("connect failed: status=$status")) }
            .enqueue()
    }

private suspend fun disconnectSuspend(manager: WhoopBleManager) =
    suspendCancellableCoroutine<Unit> { cont ->
        manager.disconnect()
            .done { if (cont.isActive) cont.resume(Unit) }
            .fail { _, status -> if (cont.isActive) cont.resume(Unit) } // best-effort on the way out
            .enqueue()
    }

/**
 * Ties scanning -> connect -> handshake -> derive -> upload into one sync pass, run
 * either from the manual "Sync now" button or the WorkManager periodic task. Same
 * shape as the (now-deleted) Flutter build's equivalent orchestration.
 */
class SyncOrchestrator(private val context: Context, private val onLog: (String) -> Unit = {}) {
    private val db = LocalDb(context)
    private val config = LifeosConfig(context)
    private val uploader = Uploader(config, db, onLog)

    suspend fun runOnce(): SyncResult {
        if (!config.isConfigured()) {
            onLog("Set the LifeOS URL + token in Settings first.")
            return SyncResult(connected = false, samplesDerived = 0, uploaded = 0)
        }

        onLog("Scanning for strap…")
        val found = StrapScanner(context).scanForStrap()
        var connected = false
        if (found != null) {
            val (device, type) = found
            onLog("Found ${type.name} strap, connecting…")
            // Connecting immediately after stopScan() is a known Android race that
            // surfaces as a status=8 connection timeout — give the radio a moment.
            delay(300)
            val manager = WhoopBleManager(context, type, db, onLog)
            try {
                connectSuspend(manager, device)
                connected = true
                onLog("Connected — running sync handshake…")
                manager.runSyncHandshake()
                // Fixed wait for the offload to stream in — a placeholder for a real
                // "offload complete" signal, same caveat as the deleted Flutter build.
                delay(45_000)
            } catch (e: Exception) {
                onLog("BLE error: ${e.message}")
            } finally {
                disconnectSuspend(manager)
            }
        } else {
            onLog("No strap found nearby.")
        }

        db.pruneOlderThan(60)
        val readings = DailyDerive.deriveForNow(db)
        val sleepSegments = SleepDerive.deriveSegments(db)
        if (readings.length() > 0 || sleepSegments.length() > 0) {
            db.enqueueUpload(readings, sleepSegments)
        }
        onLog("Derived ${readings.length()} reading(s), ${sleepSegments.length()} sleep segment(s).")
        val uploaded = uploader.drainPendingUploads()
        onLog("Uploaded $uploaded batch(es) to LifeOS.")

        return SyncResult(connected = connected, samplesDerived = readings.length(), uploaded = uploaded)
    }
}

data class SyncResult(val connected: Boolean, val samplesDerived: Int, val uploaded: Int)

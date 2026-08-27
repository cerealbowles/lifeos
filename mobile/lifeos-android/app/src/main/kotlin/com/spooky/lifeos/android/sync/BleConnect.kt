package com.spooky.lifeos.android.sync

import android.bluetooth.BluetoothDevice
import com.spooky.lifeos.android.ble.WhoopBleManager
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
 * Ported in from mobile/whoop-bridge (now retired) verbatim — WhoopSyncService is the
 * only consumer here (the standalone app's periodic WorkManager path wasn't ported;
 * see WhoopSyncService's own doc for why the held-open connection is the only mode now).
 *
 * `.retry(3, 300)` — status=8 (Bluetooth HCI "Connection Timeout") on the first real
 * pairing attempt against physical hardware. A well-known Android BLE gotcha, not a
 * protocol bug: a single connect attempt made right after a scan stops is prone to
 * exactly this timeout. Retrying with a short backoff is the standard fix.
 */
suspend fun connectSuspend(manager: WhoopBleManager, device: BluetoothDevice) =
    suspendCancellableCoroutine<Unit> { cont ->
        manager.connect(device)
            .useAutoConnect(false)
            .retry(3, 300)
            .timeout(20_000)
            .done { if (cont.isActive) cont.resume(Unit) }
            .fail { _, status -> if (cont.isActive) cont.resumeWithException(RuntimeException("connect failed: status=$status")) }
            .enqueue()
    }

suspend fun disconnectSuspend(manager: WhoopBleManager) =
    suspendCancellableCoroutine<Unit> { cont ->
        manager.disconnect()
            .done { if (cont.isActive) cont.resume(Unit) }
            .fail { _, status -> if (cont.isActive) cont.resume(Unit) } // best-effort on the way out
            .enqueue()
    }

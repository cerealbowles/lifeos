package com.spooky.lifeos.android.ble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import com.spooky.lifeos.whoopbridge.protocol.DeviceType
import com.spooky.lifeos.whoopbridge.protocol.GattProfile
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * Scans for an advertised WHOOP GATT service using Android's native BLE scan API
 * directly — plain, stable, well-documented platform surface, unlike the GATT
 * connection/request-queue layer where Nordic's library earns its keep.
 *
 * Gen5-only, deliberately — found live: the scanner used to accept the first
 * match of EITHER generation's service prefix, first-advertisement-wins with no
 * way to prefer "the strap on your wrist" over any other Whoop-shaped BLE
 * advertisement in range (an old device lying around, another household
 * member's, etc.). Since the real hardware here is confirmed Gen5, narrowing
 * the match removes that race entirely rather than trying to arbitrate it.
 */
class StrapScanner(private val context: Context) {
    suspend fun scanForStrap(timeoutMs: Long = 15_000): Pair<BluetoothDevice, DeviceType>? {
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: return null
        val scanner = adapter.bluetoothLeScanner ?: return null

        return withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val callback = object : ScanCallback() {
                    override fun onScanResult(callbackType: Int, result: ScanResult) {
                        val type = matchDeviceType(result) ?: return
                        if (cont.isActive) {
                            scanner.stopScan(this)
                            cont.resume(result.device to type)
                        }
                    }

                    override fun onScanFailed(errorCode: Int) {
                        if (cont.isActive) cont.resume(null)
                    }
                }

                cont.invokeOnCancellation { scanner.stopScan(callback) }

                val settings = ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build()
                scanner.startScan(null, settings, callback)
            }
        }
    }

    private fun matchDeviceType(result: ScanResult): DeviceType? {
        val uuids = result.scanRecord?.serviceUuids ?: return null
        val gen5Prefix = GattProfile.GEN5.servicePrefix.lowercase()
        for (parcelUuid in uuids) {
            if (parcelUuid.uuid.toString().lowercase().startsWith(gen5Prefix)) return DeviceType.GEN5
        }
        return null
    }
}

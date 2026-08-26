package com.spooky.lifeos.whoopbridge.ble

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import android.content.Context
import com.spooky.lifeos.whoopbridge.db.LocalDb
import com.spooky.lifeos.whoopbridge.protocol.BandProfile
import com.spooky.lifeos.whoopbridge.protocol.DeviceType
import com.spooky.lifeos.whoopbridge.protocol.Frame
import com.spooky.lifeos.whoopbridge.protocol.FrameReassembler
import com.spooky.lifeos.whoopbridge.protocol.PacketType
import com.spooky.lifeos.whoopbridge.protocol.buildBatchAck
import com.spooky.lifeos.whoopbridge.protocol.cmdGetDataRangeGen5
import com.spooky.lifeos.whoopbridge.protocol.cmdSendHistoricalGen5
import com.spooky.lifeos.whoopbridge.protocol.cmdSetClock
import com.spooky.lifeos.whoopbridge.protocol.decodeRecord
import com.spooky.lifeos.whoopbridge.protocol.gen5ClientHello
import com.spooky.lifeos.whoopbridge.protocol.initPackets
import com.spooky.lifeos.whoopbridge.protocol.parseGen5Historical
import kotlinx.coroutines.delay
import no.nordicsemi.android.ble.BleManager
import no.nordicsemi.android.ble.data.Data
import java.util.UUID

/**
 * Pairs with a WHOOP strap over BLE and drains its records into local_db, using the
 * hand-ported `protocol` module (see the plan's "Protocol port is real, not guessed"
 * section) for framing/CRC/commands — no byte offsets invented here.
 *
 * Subclasses Nordic's [BleManager] for connection lifecycle + the GATT write/notify
 * request queue, rather than driving raw [android.bluetooth.BluetoothGatt] callbacks
 * directly — same reasoning the (now-deleted) Flutter build applied when it picked
 * flutter_blue_plus over hand-rolled BLE: a real device's GATT callback ordering has
 * well-known footguns a maintained library already handles.
 */
class WhoopBleManager(
    context: Context,
    private val deviceType: DeviceType,
    private val localDb: LocalDb,
    private val onLog: (String) -> Unit = {},
) : BleManager(context) {

    private val band = BandProfile.of(deviceType)
    private val reassembler = FrameReassembler(band)

    private var cmdToChar: BluetoothGattCharacteristic? = null
    private var cmdFromChar: BluetoothGattCharacteristic? = null
    private var eventsChar: BluetoothGattCharacteristic? = null
    private var dataChar: BluetoothGattCharacteristic? = null

    private var seq = 0
    private fun nextSeq(): Int = (seq++) and 0xFF

    override fun getGattCallback(): BleManagerGattCallback = object : BleManagerGattCallback() {
        override fun isRequiredServiceSupported(gatt: BluetoothGatt): Boolean {
            val prefix = band.gatt.servicePrefix.lowercase()
            val service: BluetoothGattService = gatt.services.firstOrNull {
                it.uuid.toString().lowercase().startsWith(prefix)
            } ?: return false

            cmdToChar = service.getCharacteristic(UUID.fromString(band.gatt.cmdTo))
            cmdFromChar = service.getCharacteristic(UUID.fromString(band.gatt.cmdFrom))
            eventsChar = service.getCharacteristic(UUID.fromString(band.gatt.events))
            dataChar = service.getCharacteristic(UUID.fromString(band.gatt.data))

            return cmdToChar != null && cmdFromChar != null && eventsChar != null && dataChar != null
        }

        override fun initialize() {
            for (characteristic in listOfNotNull(cmdFromChar, eventsChar, dataChar)) {
                setNotificationCallback(characteristic).with { _, data ->
                    onNotify(data)
                }
                enableNotifications(characteristic).enqueue()
            }
        }

        override fun onServicesInvalidated() {
            cmdToChar = null
            cmdFromChar = null
            eventsChar = null
            dataChar = null
        }
    }

    private fun onNotify(data: Data) {
        val bytes = data.value ?: return
        val frames: List<Frame> = reassembler.feed(bytes)
        for (frame in frames) {
            if (!frame.valid) {
                onLog("Dropped frame with bad CRC (resyncs so far: ${reassembler.resyncs})")
                continue
            }
            handleFrame(frame)
        }
    }

    private fun handleFrame(frame: Frame) {
        when (frame.packetType) {
            PacketType.METADATA -> {
                // Continuation token lives at inner[13:21] on a HistoryEnd marker —
                // see Commands.kt's buildBatchAck doc. Ack immediately so the strap
                // sends its next batch.
                if (frame.inner.size >= 21) {
                    val token = frame.inner.copyOfRange(13, 21)
                    sendCommand(buildBatchAck(nextSeq(), token, band))
                }
            }
            PacketType.HISTORICAL_DATA, PacketType.REALTIME_DATA -> {
                if (deviceType == DeviceType.GEN5) {
                    // gen5 v18 only (see Gen5Records.kt) — other gen5 record kinds
                    // (v20/v21/v22/v26) aren't ported, out of this app's raw-vitals
                    // scope. parseGen5Historical returns null for those, same
                    // honest-abstention contract as gen4's decodeRecord.
                    val sample = parseGen5Historical(frame.inner)
                    if (sample != null) {
                        localDb.insertSample(
                            tsSec = sample.unix,
                            hr = if (sample.heartRate > 0) sample.heartRate else null,
                            rrMs = sample.rrIntervalsMs,
                            gen = "gen5",
                            // Both decoded off every sample already — previously logged to
                            // the on-screen debug text and then discarded. Now persisted.
                            skinTempC = sample.skinTempCOrNull,
                            sleepState = sample.sleepState.name,
                        )
                        onLog(
                            "Sample @ ${sample.unix}: hr=${sample.heartRate} rr=${sample.rrIntervalsMs.size} " +
                                "skinTempC=${sample.skinTempCOrNull} sleepState=${sample.sleepState}",
                        )
                    }
                } else {
                    val record = decodeRecord(frame.inner)
                    if (record != null) {
                        localDb.insertSample(
                            tsSec = record.tsEpochSec,
                            hr = record.hrBpm,
                            rrMs = record.rrIntervalsMs,
                            gen = "gen4",
                        )
                        onLog("Sample @ ${record.tsEpochSec}: hr=${record.hrBpm} rr=${record.rrIntervalsMs.size} raw=${record.rawInnerHex}")
                    }
                }
            }
            else -> {
                // Events / command responses not acted on in v1 (raw vitals only,
                // per the plan's scope) — logged for visibility during first pairing.
                onLog("Frame kind=${frame.packetType} opcode=${frame.opcode}")
            }
        }
    }

    private fun sendCommand(bytes: ByteArray) {
        val characteristic = cmdToChar ?: return
        writeCharacteristic(characteristic, bytes, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT).enqueue()
    }

    /**
     * Runs the init/offload handshake.
     *
     * gen4: [initPackets], the package's own hardware-verified 5-packet sequence
     * (see CrcTest) — sent one at a time ~120ms apart per its own doc comment.
     *
     * gen5: gen5ClientHello -> GET_DATA_RANGE -> SEND_HISTORICAL_DATA. Each
     * individual command's bytes are doc-verified (see Gen5Test — gen5ClientHello
     * matches the WHOOP 5.0 BLE reference docs' own literal wire example), but
     * unlike gen4's, this exact SEQUENCE/ORDER isn't itself a hardware-verified
     * fixture from the original — it's this port's own reasonable construction,
     * mirroring gen4's shape. This is the piece most likely to need adjustment
     * once tested against a real gen5 strap.
     */
    suspend fun runSyncHandshake() {
        sendCommand(cmdSetClock(nextSeq(), profile = band))
        delay(150)
        if (deviceType == DeviceType.GEN4) {
            for (packet in initPackets) {
                sendCommand(packet)
                delay(120)
            }
        } else {
            sendCommand(gen5ClientHello(nextSeq()))
            delay(120)
            sendCommand(cmdGetDataRangeGen5(nextSeq()))
            delay(120)
            sendCommand(cmdSendHistoricalGen5(nextSeq()))
        }
    }
}

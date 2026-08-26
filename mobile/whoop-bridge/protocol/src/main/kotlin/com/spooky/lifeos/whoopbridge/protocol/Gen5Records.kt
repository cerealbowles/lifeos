package com.spooky.lifeos.whoopbridge.protocol

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * gen5 (WHOOP 5.0 "Maverick"/"Goose") historical-record decoding — v18 only
 * ("per-second biometric summary," the gen5 analogue of gen4's R24; the only gen5
 * historical record kind this app's raw-vitals scope needs).
 *
 * Ported from OpenStrap/protocol's `gen5_records.dart` (MIT, same pinned commit as
 * the rest of this module). Deliberately NOT porting v20 (raw optical deep buffer),
 * v21 (100Hz IMU deep buffer), v22 (opt-in research telemetry), or v26 (Pulse
 * Information Packet) — those are real, independently-verified decoders in the
 * original, but none of them are heart-rate/R-R data, and porting ~1900 more lines
 * of firmware-version-specific binary layouts for fields this app doesn't use isn't
 * a good trade. An unrecognized version returns null here, same honest-abstention
 * contract as gen4's decodeRecord — never a fabricated read.
 *
 * v18's field layout is byte-verified against a REAL, CRC-valid captured frame from
 * the original's own test suite — see Gen5RecordsTest, which ports that exact fixture
 * and asserts the same decoded values (heart rate 102, R-R [602, 613], skin temp
 * 30.57°C, etc.) byte-for-byte.
 */

/** The band's own coarse wake/sleep state (bits 4-5 of the sleep-state byte). */
enum class Gen5SleepState { WAKE, STILL, SLEEP, UP }

data class Gen5HistoricalHeader(
    val version: Int,
    val flags: Int,
    val recordIndex: Long,
    val unix: Long,
    val tsSubsec: Int?,
) {
    /** Optical sample rate this record was captured at, in Hz — bit 7 of [flags]. */
    val ppgSampleRateHz: Int get() = if (flags and 0x80 != 0) 25 else 50

    companion object {
        fun tryParse(inner: ByteArray): Gen5HistoricalHeader? {
            if (inner.size < 11) return null
            val buf = ByteBuffer.wrap(inner).order(ByteOrder.LITTLE_ENDIAN)
            return Gen5HistoricalHeader(
                version = inner[1].toInt() and 0xFF,
                flags = inner[2].toInt() and 0xFF,
                recordIndex = buf.getInt(3).toLong() and 0xFFFFFFFFL,
                unix = buf.getInt(7).toLong() and 0xFFFFFFFFL,
                tsSubsec = if (inner.size >= 13) (buf.getShort(11).toInt() and 0xFFFF) else null,
            )
        }
    }
}

/**
 * Decoded gen5 v18 historical record — heart rate, R-R intervals, skin temperature,
 * and a handful of other fields, matching the original's field-by-field confidence
 * annotations (only the fields this app actually consumes are ported; see the
 * original `gen5_records.dart` for the full field set with its detailed provenance
 * notes on each one).
 */
data class Gen5HistorySample(
    val histVersion: Int,
    val flags: Int,
    val recordIndex: Long,
    val unix: Long,
    val tsSubsec: Int,
    /** bpm, 0 = "no reading this second" (warming up / off skin) — never fabricated. */
    val heartRate: Int,
    val rrIntervalsMs: List<Int>,
    val gravityG: List<Double>,
    val dynamicAccelerationG: Double?,
    /** AS6221 skin temp, °C = raw/100 (gen5-specific scale, NOT gen4's). Sentinel -50.00°C = unavailable. */
    val skinTempC: Double,
    val sleepStateByte: Int,
) {
    val subSecond: Double get() = tsSubsec / 32768.0
    val ppgSampleRateHz: Int get() = if (flags and 0x80 != 0) 25 else 50
    val skinTempAvailable: Boolean get() = Math.round(skinTempC * 100) != -5000L
    val skinTempCOrNull: Double? get() = if (skinTempAvailable) skinTempC else null
    val sleepState: Gen5SleepState get() = Gen5SleepState.entries[(sleepStateByte ushr 4) and 0x03]
}

// Verified against records.dart's actual constants (not guessed): kMinRrMs=200, kMaxRrMs=2500.
private const val MIN_RR_MS = 200
private const val MAX_RR_MS = 2500

/** Shortest v18 inner every field this decoder reads stays inside (nominal length is 112). */
private const val GEN5_V18_MIN_READABLE_LEN = 109

object Gen5V18Decoder {
    fun matches(inner: ByteArray): Boolean = inner.size >= GEN5_V18_MIN_READABLE_LEN && (inner[1].toInt() and 0xFF) == 18

    fun decode(inner: ByteArray): Gen5HistorySample? {
        if (!matches(inner)) return null
        val hdr = Gen5HistoricalHeader.tryParse(inner) ?: return null
        val buf = ByteBuffer.wrap(inner).order(ByteOrder.LITTLE_ENDIAN)

        val hrRaw = inner[14].toInt() and 0xFF
        val hr = if (hrRaw in 25..230) hrRaw else 0

        val declaredRr = inner[15].toInt() and 0xFF
        val rr = ArrayList<Int>()
        if (declaredRr <= 4) {
            for (i in 0 until declaredRr) {
                val offset = 16 + 2 * i
                if (offset + 2 <= inner.size) {
                    val v = buf.getShort(offset).toInt()
                    if (v in MIN_RR_MS..MAX_RR_MS) rr.add(v)
                }
            }
        }

        val fullScaleG = 16.0
        val dynAccel = buf.getFloat(33).toDouble()
        val gx = buf.getFloat(37).toDouble()
        val gy = buf.getFloat(41).toDouble()
        val gz = buf.getFloat(45).toDouble()
        val gravityOk = gx.isFinite() && gy.isFinite() && gz.isFinite() &&
            Math.abs(gx) <= fullScaleG && Math.abs(gy) <= fullScaleG && Math.abs(gz) <= fullScaleG
        val dynOk = dynAccel.isFinite() && dynAccel >= 0 && dynAccel <= fullScaleG

        return Gen5HistorySample(
            histVersion = hdr.version,
            flags = hdr.flags,
            recordIndex = hdr.recordIndex,
            unix = hdr.unix,
            tsSubsec = buf.getShort(11).toInt() and 0xFFFF,
            heartRate = hr,
            rrIntervalsMs = rr,
            gravityG = if (gravityOk) listOf(gx, gy, gz) else emptyList(),
            dynamicAccelerationG = if (dynOk) dynAccel else null,
            skinTempC = buf.getShort(65).toInt() / 100.0,
            sleepStateByte = inner[73].toInt() and 0xFF,
        )
    }
}

/** Decode a gen5 historical record. Returns null for anything not v18 (see class doc). */
fun parseGen5Historical(inner: ByteArray): Gen5HistorySample? {
    if (inner.size < 11) return null
    if ((inner[1].toInt() and 0xFF) == 18) return Gen5V18Decoder.decode(inner)
    return null
}

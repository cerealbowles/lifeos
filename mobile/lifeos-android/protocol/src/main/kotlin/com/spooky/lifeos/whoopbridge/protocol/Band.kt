package com.spooky.lifeos.whoopbridge.protocol

/** Which physical WHOOP generation / wire format a link is speaking. */
enum class DeviceType { GEN4, GEN5 }

/**
 * GATT service + characteristic UUIDs for one generation. Ported from
 * OpenStrap/protocol's `band.dart`. The low nibble is identical across generations
 * (0001 service, 0002 write, 0003 cmd-from, 0004 events, 0005 data) — only the
 * 32-bit prefix + 96-bit base suffix change.
 */
data class GattProfile(
    val service: String,
    val cmdTo: String, // write w/response (app -> strap)
    val cmdFrom: String, // notify command responses (strap -> app)
    val events: String, // notify strap events
    val data: String, // notify data/history packets
) {
    /** The service-UUID 32-bit prefix used to identify this generation from a scan result. */
    val servicePrefix: String get() = service.substring(0, 8)

    companion object {
        /** WHOOP 4 — base `6108000x-8d6d-82b8-614a-1c8cb0f8dcc6`. */
        val GEN4 = GattProfile(
            service = "61080001-8d6d-82b8-614a-1c8cb0f8dcc6",
            cmdTo = "61080002-8d6d-82b8-614a-1c8cb0f8dcc6",
            cmdFrom = "61080003-8d6d-82b8-614a-1c8cb0f8dcc6",
            events = "61080004-8d6d-82b8-614a-1c8cb0f8dcc6",
            data = "61080005-8d6d-82b8-614a-1c8cb0f8dcc6",
        )

        /** WHOOP 5 — base `fd4b000x-cce1-4033-93ce-002d5875f58a`. */
        val GEN5 = GattProfile(
            service = "fd4b0001-cce1-4033-93ce-002d5875f58a",
            cmdTo = "fd4b0002-cce1-4033-93ce-002d5875f58a",
            cmdFrom = "fd4b0003-cce1-4033-93ce-002d5875f58a",
            events = "fd4b0004-cce1-4033-93ce-002d5875f58a",
            data = "fd4b0005-cce1-4033-93ce-002d5875f58a",
        )
    }
}

/**
 * Per-generation frame wire-format profile. Ported from `band.dart`'s `BandProfile`.
 */
class BandProfile private constructor(
    val type: DeviceType,
    /** Header length in bytes before the inner payload (gen4 = 4, gen5 = 8). */
    val headerLen: Int,
    /** Byte offset of the u16-LE declared-length field within the header. */
    val sizeFieldOffset: Int,
    val outboundDirectionMarker: IntArray? = null,
) {
    val isGen5: Boolean get() = type == DeviceType.GEN5
    val gatt: GattProfile get() = if (isGen5) GattProfile.GEN5 else GattProfile.GEN4

    fun declaredLen(frame: ByteArray): Int {
        val lo = frame[sizeFieldOffset].toInt() and 0xFF
        val hi = frame[sizeFieldOffset + 1].toInt() and 0xFF
        return lo or (hi shl 8)
    }

    fun totalLen(declared: Int): Int = headerLen + declared

    /** gen4 = crc8 over the 2 length bytes at frame[3]; gen5 = crc16-modbus over frame[0:6] at frame[6:8] LE. */
    fun headerCrcValid(frame: ByteArray): Boolean {
        if (!isGen5) {
            if (frame.size < 4) return false
            return (frame[3].toInt() and 0xFF) == Crc.crc8(frame.copyOfRange(1, 3))
        }
        if (frame.size < 8) return false
        val want = (frame[6].toInt() and 0xFF) or ((frame[7].toInt() and 0xFF) shl 8)
        return Crc.crc16Modbus(frame.copyOfRange(0, 6)) == want
    }

    /**
     * Build the frame header for a given declared length.
     *   gen4: `[0xAA][u16 declared LE][crc8]`
     *   gen5: `[0xAA][0x01][u16 declared LE][outboundDirectionMarker][crc16modbus LE]`
     */
    fun buildHeader(declared: Int): ByteArray {
        if (!isGen5) {
            val h = ByteArray(4)
            h[0] = SOF.toByte()
            h[1] = (declared and 0xFF).toByte()
            h[2] = ((declared ushr 8) and 0xFF).toByte()
            h[3] = Crc.crc8(byteArrayOf(h[1], h[2])).toByte()
            return h
        }
        val h = ByteArray(8)
        h[0] = SOF.toByte()
        h[1] = 0x01
        h[2] = (declared and 0xFF).toByte()
        h[3] = ((declared ushr 8) and 0xFF).toByte()
        val dir = outboundDirectionMarker ?: intArrayOf(0x00, 0x01)
        h[4] = dir[0].toByte()
        h[5] = dir[1].toByte()
        val c = Crc.crc16Modbus(h.copyOfRange(0, 6))
        h[6] = (c and 0xFF).toByte()
        h[7] = ((c ushr 8) and 0xFF).toByte()
        return h
    }

    companion object {
        val GEN4 = BandProfile(DeviceType.GEN4, headerLen = 4, sizeFieldOffset = 1)
        val GEN5 = BandProfile(
            DeviceType.GEN5,
            headerLen = 8,
            sizeFieldOffset = 2,
            outboundDirectionMarker = intArrayOf(0x00, 0x01),
        )

        fun of(type: DeviceType): BandProfile = if (type == DeviceType.GEN5) GEN5 else GEN4
    }
}

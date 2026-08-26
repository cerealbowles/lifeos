package com.spooky.lifeos.whoopbridge.protocol

/**
 * CRC primitives — WHOOP 4/5 protocol. Ported from OpenStrap/protocol's `crc.dart`
 * (MIT, commit f01ad078bd590efebdc15cfcc1a2715625f119ea).
 *
 * The CRC8 table is generated algorithmically here (standard non-reflected CRC-8,
 * poly 0x07, MSB-first) rather than transcribed as a 256-entry literal from the Dart
 * source — a hand-copied 256-entry table is exactly the kind of transcription risk
 * this whole port is trying to avoid. The generation algorithm was hand-verified
 * against the Dart source's first three table entries (0, 7, 14) before relying on
 * it, and the full pipeline is cross-checked end-to-end by [CrcTest]'s ported
 * hardware-verified INIT-packet hex vectors, which depend on this table being
 * byte-exact — a wrong table fails those tests loudly, not silently.
 */
object Crc {
    private val crc8Table: IntArray = IntArray(256).also { table ->
        for (i in 0..255) {
            var c = i
            repeat(8) {
                c = if (c and 0x80 != 0) ((c shl 1) and 0xFF) xor 0x07 else (c shl 1) and 0xFF
            }
            table[i] = c
        }
    }

    /** Custom CRC-8 (poly 0x07) — applied ONLY to the 2-byte length field. */
    fun crc8(data: ByteArray): Int {
        var crc = 0
        for (b in data) {
            crc = crc8Table[(crc xor (b.toInt() and 0xFF)) and 0xFF]
        }
        return crc
    }

    // zlib CRC-32 lookup table (IEEE 802.3, reflected, poly 0xEDB88320) — standard,
    // well-known algorithm, generated the same way the Dart source generates it.
    private val crc32Table: IntArray = IntArray(256).also { table ->
        for (n in 0..255) {
            var c = n
            repeat(8) {
                c = if (c and 1 != 0) (0xEDB88320.toInt() xor (c ushr 1)) else (c ushr 1)
            }
            table[n] = c
        }
    }

    /** Standard zlib CRC-32 over the (padded) inner content. Matches Python zlib.crc32. */
    fun crc32(data: ByteArray): Int {
        var crc = -1 // 0xFFFFFFFF as Int
        for (b in data) {
            crc = crc32Table[(crc xor (b.toInt() and 0xFF)) and 0xFF] xor (crc ushr 8)
        }
        return crc.inv()
    }

    /**
     * CRC-16/MODBUS (init 0xFFFF, reflected poly 0xA001, no final XOR) over the
     * WHOOP 5 (gen5 / "fd4b") 8-byte frame header bytes [0:6]. Verified byte-exact
     * against the gen5 client HELLO frame (header `aa 01 08 00 00 01` → 0x71E6) —
     * see [CrcTest].
     */
    fun crc16Modbus(data: ByteArray): Int {
        var crc = 0xFFFF
        for (b in data) {
            crc = crc xor (b.toInt() and 0xFF)
            repeat(8) {
                crc = if (crc and 1 != 0) (crc ushr 1) xor 0xA001 else crc ushr 1
            }
        }
        return crc and 0xFFFF
    }
}

package com.spooky.lifeos.whoopbridge.protocol

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFailsWith

private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }
private fun unhex(s: String): ByteArray = ByteArray(s.length / 2) { s.substring(it * 2, it * 2 + 2).toInt(16).toByte() }

/**
 * Every fixture in this file is copied from OpenStrap/protocol's own test suite
 * (`test/framing_test.dart`, `test/gen5_test.dart`), at the exact commit already
 * vendored in the (now-deleted) Flutter build:
 * f01ad078bd590efebdc15cfcc1a2715625f119ea. These are hardware-verified, not
 * synthetic — the point is to prove this hand-port produces byte-identical output
 * to the original, not just "looks plausible."
 */
class CrcTest {
    @Test
    fun `crc16Modbus matches the gen5 hello header vector`() {
        // header bytes aa 01 08 00 00 01 -> crc16-modbus 0x71E6 (LE e6 71).
        assertEquals(0x71E6, Crc.crc16Modbus(unhex("aa0108000001")))
        assertEquals(0xFFFF, Crc.crc16Modbus(ByteArray(0)))
    }

    @Test
    fun `5-packet INIT regenerates byte-for-byte against hardware-verified hex`() {
        val expected = listOf(
            "aa0800a823002300ada86a2d",
            "aa0800a823014c00f2b5cdce",
            "aa0800a823022200824df537",
            "aa0800a823034301c54dd63d",
            "aa0800a823041600c7c25288",
        )
        for (i in expected.indices) {
            assertEquals(expected[i], hex(initPackets[i]), "INIT seq$i")
        }
    }

    @Test
    fun `round-trip parseFrame of buildCommand is valid`() {
        val raw = buildCommand(0, Cmd.GET_HELLO_HARVARD, byteArrayOf(0x00))
        val f = parseFrame(raw)
        assertTrue(f != null)
        f as Frame
        assertTrue(f.headerCrcOk)
        assertTrue(f.crc32Ok)
        assertEquals(PacketType.COMMAND, f.packetType)
        assertEquals(Cmd.GET_HELLO_HARVARD, f.opcode)
    }

    @Test
    fun `ACK has the exact 12-byte inner shape`() {
        val token = ByteArray(8) { (it + 1).toByte() }
        val raw = buildBatchAck(5, token)
        val f = parseFrame(raw)!!
        assertTrue(f.headerCrcOk && f.crc32Ok)
        assertEquals(
            listOf(PacketType.COMMAND, 5, Cmd.HISTORICAL_DATA_RESULT, REVISION1),
            f.inner.copyOfRange(0, 4).map { it.toInt() and 0xFF },
        )
        assertEquals(token.toList(), f.inner.copyOfRange(4, 12).toList())
    }

    @Test
    fun `token must be 8 bytes`() {
        assertFailsWith<IllegalArgumentException> { buildBatchAck(5, byteArrayOf(1, 2, 3)) }
    }

    @Test
    fun `reassembles across split BLE notification boundaries`() {
        val raw = buildCommand(0, Cmd.GET_HELLO_HARVARD, byteArrayOf(0x00))
        val reassembler = FrameReassembler()
        val part1 = raw.copyOfRange(0, 5)
        val part2 = raw.copyOfRange(5, raw.size)
        assertTrue(reassembler.feed(part1).isEmpty())
        val frames = reassembler.feed(part2)
        assertEquals(1, frames.size)
        assertTrue(frames[0].valid)
    }

    @Test
    fun `a corrupted length byte does not swallow the frame behind it`() {
        val good1 = buildCommand(0, Cmd.GET_HELLO_HARVARD, byteArrayOf(0x00))
        val good2 = buildCommand(1, Cmd.GET_DATA_RANGE, byteArrayOf(0x00))
        val corrupted = good1.copyOf()
        corrupted[1] = (corrupted[1] + 1).toByte() // corrupt the declared-length low byte
        val reassembler = FrameReassembler()
        val frames = reassembler.feed(corrupted + good2)
        // The corrupted frame is resynced past; the good frame behind it still decodes.
        assertTrue(frames.any { it.valid && it.opcode == Cmd.GET_DATA_RANGE })
    }
}

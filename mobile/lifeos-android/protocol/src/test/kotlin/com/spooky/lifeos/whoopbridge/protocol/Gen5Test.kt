package com.spooky.lifeos.whoopbridge.protocol

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }
private fun unhex(s: String): ByteArray = ByteArray(s.length / 2) { s.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
private fun assertClose(expected: Double, actual: Double, tolerance: Double) {
    assertTrue(Math.abs(expected - actual) <= tolerance, "expected $expected, got $actual (tolerance $tolerance)")
}

/**
 * Every fixture here is copied from OpenStrap/protocol's own test suite at the same
 * pinned commit as CrcTest — the v18 frame is a REAL, CRC-verified capture ("a worn
 * capture, unix=1780916150"), not synthetic, and `gen5ClientHello`'s expected hex is
 * pinned against the WHOOP 5.0 BLE reference docs' own literal wire example.
 */
class Gen5Test {
    @Test
    fun `gen5 client hello matches the doc-verified wire example`() {
        assertEquals("aa0108000001e67123019101363e5c8d", hex(gen5ClientHello(seq = 1)))
    }

    @Test
    fun `gen5 GET_DATA_RANGE and SEND_HISTORICAL_DATA have empty bodies`() {
        val range = parseFrame(cmdGetDataRangeGen5(1), BandProfile.GEN5)
        assertTrue(range != null)
        assertEquals(34, range.opcode) // GET_DATA_RANGE = 0x22 = 34
        assertEquals(4, range.inner.size) // header(type,seq,opcode) + 1 padding byte
        assertEquals(0, range.inner[3].toInt())

        val send = parseFrame(cmdSendHistoricalGen5(1), BandProfile.GEN5)
        assertTrue(send != null)
        assertEquals(22, send.opcode) // SEND_HISTORICAL_DATA = 0x16 = 22
    }

    @Test
    fun `real v18 capture decodes to the same values the original asserts`() {
        // aa01740001003fb12f1280733d8401b69f266a66460066025a0265020000000000007b
        // 0a8d656463ff0012163cf6a439bf2924fd3ed763fe3e3200aa000000000000000000f7
        // 000901f10b0007010c020c00000000000000000000000000000000000000000000000
        // 100656f1e1e0000009d61a7c00000003e862817
        // A "worn" capture, unix=1780916150 — CRC16+CRC32 both verified below.
        val frame = unhex(
            "aa01740001003fb12f1280733d8401b69f266a66460066025a0265020000000" +
                "000007b0a8d656463ff0012163cf6a439bf2924fd3ed763fe3e3200aa000000" +
                "000000000000f7000901f10b0007010c020c000000000000000000000000000" +
                "00000000000000000000100656f1e1e0000009d61a7c00000003e862817",
        )
        val parsed = parseFrame(frame, BandProfile.GEN5)
        assertTrue(parsed != null)
        assertTrue(parsed.valid, "both gen5 CRCs must check out")

        val sample = parseGen5Historical(parsed.inner)
        assertTrue(sample != null)

        assertEquals(18, sample.histVersion)
        assertEquals(25443699L, sample.recordIndex)
        assertEquals(1780916150L, sample.unix)
        assertEquals(18022, sample.tsSubsec)
        assertClose(0.5500, sample.subSecond, 1e-4)
        assertEquals(0x80, sample.flags)
        assertEquals(25, sample.ppgSampleRateHz)

        assertEquals(102, sample.heartRate)
        assertEquals(listOf(602, 613), sample.rrIntervalsMs)

        assertClose(-0.7252, sample.gravityG[0], 1e-3)
        assertClose(0.4944, sample.gravityG[1], 1e-3)
        assertClose(0.4969, sample.gravityG[2], 1e-3)
        val dynAccel = sample.dynamicAccelerationG
        assertTrue(dynAccel != null)
        assertClose(0.00916, dynAccel, 1e-3)

        assertClose(30.57, sample.skinTempC, 1e-2)
        assertTrue(sample.skinTempAvailable)

        assertEquals(0, sample.sleepStateByte)
        assertEquals(Gen5SleepState.WAKE, sample.sleepState)
    }
}

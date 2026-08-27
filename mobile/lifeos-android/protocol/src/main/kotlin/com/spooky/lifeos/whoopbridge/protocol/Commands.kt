package com.spooky.lifeos.whoopbridge.protocol

/**
 * The 5-packet INIT handshake (hardware-verified, seq 0..4), ported verbatim from
 * OpenStrap/protocol's `commands.dart`. Send one-at-a-time, ~120ms apart. seq4
 * triggers the flash drain. [CrcTest] asserts every packet here matches the real
 * hardware-verified hex from the original's own test suite, byte-for-byte.
 */
val initPackets: List<ByteArray> = listOf(
    buildCommand(0, Cmd.GET_HELLO_HARVARD, byteArrayOf(0x00)), // seq0
    buildCommand(1, Cmd.GET_ADVERTISING_NAME_HARVARD, byteArrayOf(0x00)), // seq1
    buildCommand(2, Cmd.GET_DATA_RANGE, byteArrayOf(0x00)), // seq2
    buildCommand(3, Cmd.GET_ALARM_TIME, byteArrayOf(REVISION1.toByte())), // seq3
    buildCommand(4, Cmd.SEND_HISTORICAL_DATA, byteArrayOf(0x00)), // seq4 -> drain
)

fun cmdGetHello(seq: Int): ByteArray = buildCommand(seq, Cmd.GET_HELLO_HARVARD, byteArrayOf(0x00))
fun cmdAbortHistorical(seq: Int): ByteArray = buildCommand(seq, Cmd.ABORT_HISTORICAL_TRANSMITS, byteArrayOf(0x00))
fun cmdSendHistorical(seq: Int): ByteArray = buildCommand(seq, Cmd.SEND_HISTORICAL_DATA, byteArrayOf(0x00))
fun cmdGetDataRange(seq: Int): ByteArray = buildCommand(seq, Cmd.GET_DATA_RANGE, byteArrayOf(0x00))

/**
 * gen5's HELLO frame — byte-verified against the WHOOP 5.0 BLE reference docs' own
 * literal wire example (`aa0108000001e67123019101363e5c8d` for seq=1), not just
 * eyeballed. See Gen5CommandsTest.
 */
fun gen5ClientHello(seq: Int = 1): ByteArray = buildCommand(seq, Cmd.GET_HELLO_GEN5, byteArrayOf(0x01), BandProfile.GEN5)

/** gen5 GET_DATA_RANGE (0x22) with the EMPTY payload gen5 expects (gen4's carries a 0x00). */
fun cmdGetDataRangeGen5(seq: Int): ByteArray = buildCommand(seq, Cmd.GET_DATA_RANGE, byteArrayOf(), BandProfile.GEN5)

/** gen5 SEND_HISTORICAL_DATA (0x16), empty payload — starts the flash drain. */
fun cmdSendHistoricalGen5(seq: Int): ByteArray = buildCommand(seq, Cmd.SEND_HISTORICAL_DATA, byteArrayOf(), BandProfile.GEN5)

/**
 * Set the strap RTC — WHOOP-exact 8-byte payload: `[0:4]` whole seconds (unix epoch,
 * u32 LE), `[4:8]` sub-seconds in units of 1/32768s. Wrong-length sets are ACK'd but
 * NOT latched, so the strap serves nothing dated correctly — see the original's own
 * warning in `commands.dart`.
 */
fun cmdSetClock(seq: Int, now: Long = System.currentTimeMillis(), profile: BandProfile = BandProfile.GEN4): ByteArray {
    val sec = (now / 1000).toInt()
    val subsec = (((now % 1000) * 32768) / 1000).toInt()
    val payload = byteArrayOf(
        (sec and 0xFF).toByte(),
        ((sec ushr 8) and 0xFF).toByte(),
        ((sec ushr 16) and 0xFF).toByte(),
        ((sec ushr 24) and 0xFF).toByte(),
        (subsec and 0xFF).toByte(),
        ((subsec ushr 8) and 0xFF).toByte(),
        0,
        0,
    )
    return buildCommand(seq, Cmd.SET_CLOCK, payload, profile)
}

/**
 * Acknowledge a historical batch — same builder for both "history result OK" and
 * "batch ack" (the original exposes both names for the same 12-byte inner shape:
 * `[COMMAND][seq][HISTORICAL_DATA_RESULT][REVISION1] + 8-byte token`). [token] is
 * echoed VERBATIM from the METADATA frame's continuation token
 * (`inner[13:21]`) — see [CrcTest] for the shape assertion ported from the original.
 */
fun buildBatchAck(seq: Int, token: ByteArray, profile: BandProfile = BandProfile.GEN4): ByteArray {
    require(token.size == 8) { "batch token must be 8 bytes, got ${token.size}" }
    val inner = byteArrayOf(
        PacketType.COMMAND.toByte(),
        (seq and 0xFF).toByte(),
        Cmd.HISTORICAL_DATA_RESULT.toByte(),
        REVISION1.toByte(),
    ) + token
    return buildFrame(inner, profile)
}

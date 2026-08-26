package com.spooky.lifeos.whoopbridge.protocol

/** Start-of-frame marker. */
const val SOF: Int = 0xAA

/** Magic first byte for *_HARVARD / 2-byte toggles (gen4); gen5's frame-revision byte. */
const val REVISION1: Int = 0x01

/**
 * Packet-type byte (frame.inner[0]). Only the subset actually used by this app's v1
 * scope (init handshake + historical/realtime data + metadata ack) — ported from
 * OpenStrap/protocol's `constants.dart`, not the full battery-pack/console-log set.
 */
object PacketType {
    const val COMMAND = 0x23
    const val COMMAND_RESPONSE = 0x24
    const val REALTIME_DATA = 0x28
    const val REALTIME_RAW_DATA = 0x2B
    const val HISTORICAL_DATA = 0x2F
    const val EVENT = 0x30
    const val METADATA = 0x31
}

/**
 * Command opcodes. Every value below is cross-validated, not just transcribed: the
 * 5-packet INIT handshake ported into [Commands.initPackets] encodes
 * `getHelloHarvard`/`getAdvertisingNameHarvard`/`getDataRange`/`getAlarmTime`/
 * `sendHistoricalData` directly into its bytes, and [CrcTest] asserts those bytes
 * match the real hardware-verified hex from OpenStrap/protocol's own test suite
 * verbatim — a wrong opcode here fails that assertion immediately.
 */
object Cmd {
    const val SET_CLOCK = 0x0A
    const val GET_CLOCK = 0x0B
    const val ABORT_HISTORICAL_TRANSMITS = 0x14
    const val SEND_HISTORICAL_DATA = 0x16
    const val HISTORICAL_DATA_RESULT = 0x17 // the batch ACK
    const val GET_DATA_RANGE = 0x22
    const val GET_HELLO_HARVARD = 0x23
    const val GET_ALARM_TIME = 0x43
    const val GET_ADVERTISING_NAME_HARVARD = 0x4C

    /**
     * gen5's HELLO opcode — NOT [GET_HELLO_HARVARD]. Verified against the WHOOP 5.0
     * BLE reference docs' own literal wire example, not just eyeballed: see
     * Gen5CommandsTest, which asserts `gen5ClientHello(seq=1)` produces
     * `aa0108000001e67123019101363e5c8d` byte-for-byte.
     */
    const val GET_HELLO_GEN5 = 0x91
}

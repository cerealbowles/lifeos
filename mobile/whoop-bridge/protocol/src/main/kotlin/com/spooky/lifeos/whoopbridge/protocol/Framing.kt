package com.spooky.lifeos.whoopbridge.protocol

/**
 * A fully-parsed, validated frame envelope. Ported from OpenStrap/protocol's
 * `framing.dart`.
 */
class Frame(
    val inner: ByteArray, // padded inner (type, seq, opcode, body...)
    val headerCrcOk: Boolean,
    val crc32Ok: Boolean,
    val frameRevOk: Boolean = true,
) {
    val valid: Boolean get() = headerCrcOk && crc32Ok

    /** Safe to read packetType/seq/opcode with the rev-1 field offsets. */
    val decodable: Boolean get() = valid && frameRevOk

    val packetType: Int get() = if (inner.isNotEmpty()) inner[0].toInt() and 0xFF else -1
    val seq: Int get() = if (inner.size > 1) inner[1].toInt() and 0xFF else -1
    val opcode: Int get() = if (inner.size > 2) inner[2].toInt() and 0xFF else -1
    val body: ByteArray get() = if (inner.size > 3) inner.copyOfRange(3, inner.size) else ByteArray(0)
}

/** Zero-pad to a 4-byte boundary (CRC32 is computed over the padded form). */
fun pad4(data: ByteArray): ByteArray {
    val padLen = (4 - (data.size % 4)) % 4
    if (padLen == 0) return data
    return data + ByteArray(padLen)
}

/** Wrap inner content in a frame envelope. */
fun buildFrame(inner: ByteArray, profile: BandProfile = BandProfile.GEN4): ByteArray {
    val innerP = pad4(inner)
    val declared = innerP.size + 4 // +4 = trailing CRC32
    val header = profile.buildHeader(declared)
    val c32 = Crc.crc32(innerP)

    val tail = ByteArray(4)
    tail[0] = (c32 and 0xFF).toByte()
    tail[1] = ((c32 ushr 8) and 0xFF).toByte()
    tail[2] = ((c32 ushr 16) and 0xFF).toByte()
    tail[3] = ((c32 ushr 24) and 0xFF).toByte()

    return header + innerP + tail
}

fun buildCommand(seq: Int, opcode: Int, payload: ByteArray = byteArrayOf(0x00), profile: BandProfile = BandProfile.GEN4): ByteArray {
    val inner = byteArrayOf(PacketType.COMMAND.toByte(), (seq and 0xFF).toByte(), (opcode and 0xFF).toByte()) + payload
    return buildFrame(inner, profile)
}

/** Parse a single complete frame. Returns null if too short / bad SOF. */
fun parseFrame(raw: ByteArray, profile: BandProfile = BandProfile.GEN4): Frame? {
    val headerLen = profile.headerLen
    if (raw.size < headerLen + 4 || (raw[0].toInt() and 0xFF) != SOF) return null
    val declared = profile.declaredLen(raw)
    if (declared < 4) return null
    val headerCrcOk = profile.headerCrcValid(raw)
    val innerStart = headerLen
    val total = headerLen + declared
    if (raw.size < total) return null

    val inner = raw.copyOfRange(innerStart, innerStart + declared - 4)
    val storedCrc = run {
        val o = innerStart + declared - 4
        (raw[o].toInt() and 0xFF) or
            ((raw[o + 1].toInt() and 0xFF) shl 8) or
            ((raw[o + 2].toInt() and 0xFF) shl 16) or
            ((raw[o + 3].toInt() and 0xFF) shl 24)
    }
    val frameRevOk = !profile.isGen5 || (raw[1].toInt() and 0xFF) == REVISION1
    return Frame(inner, headerCrcOk, storedCrc == Crc.crc32(inner), frameRevOk)
}

/**
 * Length-based reassembler. `feed()` returns every complete [Frame] it can carve out
 * of the running buffer. Length-based (NOT "reset on 0xAA") — sensor payloads contain
 * 0xAA and BLE notification boundaries land on them, per the original's own framing
 * note. Construct ONE per BLE session (a session speaks one generation).
 */
class FrameReassembler(private val profile: BandProfile = BandProfile.GEN4) {
    private val buf = ArrayList<Byte>()

    /** Number of times a bad envelope forced a resync — a degraded-link signal. */
    var resyncs: Int = 0
        private set

    fun feed(chunk: ByteArray): List<Frame> {
        val out = ArrayList<Frame>()
        buf.addAll(chunk.toList())

        fun resync(): Boolean {
            resyncs++
            var next = -1
            for (i in 1 until buf.size) {
                if ((buf[i].toInt() and 0xFF) == SOF) {
                    next = i
                    break
                }
            }
            if (next < 0) {
                buf.clear()
                return false
            }
            repeat(next) { buf.removeAt(0) }
            return true
        }

        val headerLen = profile.headerLen
        while (buf.size >= headerLen + 4) {
            if ((buf[0].toInt() and 0xFF) != SOF) {
                if (!resync()) break
                continue
            }
            val bufArr = buf.toByteArray()
            val declared = profile.declaredLen(bufArr)
            val total = headerLen + declared
            if (declared < 4 || total > 4096) {
                if (!resync()) break
                continue
            }
            if (buf.size < headerLen || !profile.headerCrcValid(bufArr)) {
                if (!resync()) break
                continue
            }
            if (buf.size < total) break // wait for the rest of this frame

            val frameBytes = bufArr.copyOfRange(0, total)
            val frame = parseFrame(frameBytes, profile)
            if (frame != null) out.add(frame)
            if (frame != null && !frame.crc32Ok) {
                if (!resync()) break
                continue
            }
            repeat(total) { buf.removeAt(0) }
            // skip inter-record null padding
            while (buf.isNotEmpty() && buf[0].toInt() == 0) buf.removeAt(0)
        }
        if (buf.size > 8192) buf.clear() // safety: never grow unbounded
        return out
    }

    fun reset() {
        buf.clear()
        resyncs = 0
    }
}

private fun ArrayList<Byte>.toByteArray(): ByteArray = ByteArray(size) { this[it] }

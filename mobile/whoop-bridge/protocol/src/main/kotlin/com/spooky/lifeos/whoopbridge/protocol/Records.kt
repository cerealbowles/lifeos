package com.spooky.lifeos.whoopbridge.protocol

/**
 * Best-effort gen4 historical/realtime record decoder (R24 shape) — the one part of
 * this port that is NOT byte-exact-verified, unlike everything else in this module.
 *
 * What's ported here is anchored to specific offsets actually observed while reading
 * OpenStrap/protocol's `records.dart` (heart rate at a version-dependent offset,
 * default 17; an R-R interval count immediately following at offset 18, with the
 * intervals themselves following that). What's deliberately NOT ported: accelerometer,
 * SpO2, and skin-temperature extraction — those fields exist in the original's `R24`
 * class, but this port never directly observed their exact byte offsets (as opposed to
 * inferring them), and inventing offsets with no real basis would be worse than the
 * defensive "try several plausible key spellings" approach used elsewhere in this
 * project: a wrong invented offset produces a plausible-looking but silently corrupt
 * number, not an obvious failure. Left as a follow-up once a real strap's captured
 * bytes are available to derive them from directly.
 *
 * [rawInner] is always kept alongside the extracted fields so a real pairing session
 * makes it possible to find the missing offsets from real captures, the same defensive
 * posture used in this project's now-deleted Flutter build.
 */
data class DecodedRecord(
    val histVersion: Int,
    val counter: Long,
    val tsEpochSec: Long,
    val hrBpm: Int?,
    val rrIntervalsMs: List<Int>,
    val rawInnerHex: String,
)

private val hrOffsetByVersion: Map<Int, Int> = mapOf(24 to 17, 12 to 17)

/** Decode a historical/realtime data frame's inner payload into an R24-shaped record. */
fun decodeRecord(inner: ByteArray): DecodedRecord? {
    if (inner.size < 19) return null
    val histVersion = inner[1].toInt() and 0xFF
    val counter = (
        (inner[3].toInt() and 0xFF).toLong() or
            ((inner[4].toInt() and 0xFF).toLong() shl 8) or
            ((inner[5].toInt() and 0xFF).toLong() shl 16) or
            ((inner[6].toInt() and 0xFF).toLong() shl 24)
        )
    val tsEpoch = (
        (inner[7].toInt() and 0xFF).toLong() or
            ((inner[8].toInt() and 0xFF).toLong() shl 8) or
            ((inner[9].toInt() and 0xFF).toLong() shl 16) or
            ((inner[10].toInt() and 0xFF).toLong() shl 24)
        )

    val hrOffset = hrOffsetByVersion[histVersion] ?: 17
    val hr = if (inner.size > hrOffset) (inner[hrOffset].toInt() and 0xFF) else null

    val rrCount = if (inner.size > 18) (inner[18].toInt() and 0xFF) else 0
    val rr = ArrayList<Int>()
    var off = 19
    repeat(rrCount) {
        if (inner.size >= off + 2) {
            val v = (inner[off].toInt() and 0xFF) or ((inner[off + 1].toInt() and 0xFF) shl 8)
            rr.add(v)
            off += 2
        }
    }

    return DecodedRecord(
        histVersion = histVersion,
        counter = counter,
        tsEpochSec = tsEpoch,
        hrBpm = hr,
        rrIntervalsMs = rr,
        rawInnerHex = inner.joinToString("") { "%02x".format(it) },
    )
}

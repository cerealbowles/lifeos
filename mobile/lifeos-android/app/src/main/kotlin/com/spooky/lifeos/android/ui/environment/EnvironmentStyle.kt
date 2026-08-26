package com.spooky.lifeos.android.ui.environment

import androidx.compose.ui.graphics.Color

/**
 * Per-phase palette for [MountainScene]/[EnvironmentalBackground] — the earth-tone counterpart
 * to Background.kt's old `AuroraPalette`. Field names match the design brief's own suggested
 * `EnvironmentStyle` shape (§9) rather than reusing the aurora's "blob tone" vocabulary, since
 * the visual language is genuinely different now (a landscape composition, not glow blobs).
 */
data class EnvironmentStyle(
    val skyTop: Color,
    val skyBottom: Color,
    val horizon: Color,
    val mountainFar: Color,
    val mountainNear: Color,
    val forest: Color,
    val accent: Color,
    val ambientGlow: Color,
)

/**
 * One palette per [DayPhase], written to the brief's own per-phase mood notes (§2): dawn is
 * cool blue-green with a pale warm horizon and low contrast (mist); morning is dark forest
 * green with soft gold; afternoon is warmer/higher-contrast; golden hour is copper/clay/amber;
 * dusk is deep brown/muted orange with purple undertones; night is near-black with moonlight
 * and stars (the explicit "stars" from the brief's §2 — see [MountainScene]'s `showStars`).
 *
 * Retuned (2026-08-26, direct user feedback: "the mountains are very dark now") — the first
 * pass had every daytime phase within a few percent lightness of NIGHT (e.g. AFTERNOON's
 * skyTop/skyBottom read at ~11%/17% lightness, next to NIGHT's ~6%/9%), so the hero looked like
 * nighttime at 1pm. Daytime phases (DAWN through DUSK) now sit on a real brightness arc peaking
 * at AFTERNOON/GOLDEN_HOUR, while NIGHT stays exactly as dark as before — the contrast between
 * phases is the point, not just raising every value.
 */
fun environmentStyle(phase: DayPhase): EnvironmentStyle = when (phase) {
    DayPhase.DAWN -> EnvironmentStyle(
        skyTop = Color(0xFF17222A),
        skyBottom = Color(0xFF362F26),
        horizon = Color(0xFFD9BE8F),
        mountainFar = Color(0xFF3A4A3E),
        mountainNear = Color(0xFF232D22),
        forest = Color(0xFF1C2416),
        accent = Color(0xFF9C8058),
        ambientGlow = Color(0xFFE3CB98),
    )
    DayPhase.MORNING -> EnvironmentStyle(
        skyTop = Color(0xFF1E2A18),
        skyBottom = Color(0xFF423823),
        horizon = Color(0xFFE0B15F),
        mountainFar = Color(0xFF48583A),
        mountainNear = Color(0xFF2E3A22),
        forest = Color(0xFF202B16),
        accent = Color(0xFFC9A05E),
        ambientGlow = Color(0xFFF2D48F),
    )
    DayPhase.AFTERNOON -> EnvironmentStyle(
        skyTop = Color(0xFF3C2F1E),
        skyBottom = Color(0xFF6B4E30),
        horizon = Color(0xFFD98A4D),
        mountainFar = Color(0xFF7A6448),
        mountainNear = Color(0xFF573E29),
        forest = Color(0xFF4C4626),
        accent = Color(0xFFD98A4D),
        ambientGlow = Color(0xFFF0C57F),
    )
    DayPhase.GOLDEN_HOUR -> EnvironmentStyle(
        skyTop = Color(0xFF3A2013),
        skyBottom = Color(0xFF7A3F1C),
        horizon = Color(0xFFE08F3E),
        mountainFar = Color(0xFF7A4E2C),
        mountainNear = Color(0xFF4F2C18),
        forest = Color(0xFF3D2C17),
        accent = Color(0xFFE0923F),
        ambientGlow = Color(0xFFF5BC70),
    )
    DayPhase.DUSK -> EnvironmentStyle(
        skyTop = Color(0xFF241726),
        skyBottom = Color(0xFF452821),
        horizon = Color(0xFFC97449),
        mountainFar = Color(0xFF423349),
        mountainNear = Color(0xFF281C21),
        forest = Color(0xFF1A140F),
        accent = Color(0xFF93583A),
        ambientGlow = Color(0xFFDE926A),
    )
    DayPhase.NIGHT -> EnvironmentStyle(
        skyTop = Color(0xFF0F0F0C),
        skyBottom = Color(0xFF171611),
        horizon = Color(0xFF221C15),
        mountainFar = Color(0xFF2A2E22),
        mountainNear = Color(0xFF1B1913),
        forest = Color(0xFF12140D),
        accent = Color(0xFFC29563),
        ambientGlow = Color(0xFFD8C7AA),
    )
}

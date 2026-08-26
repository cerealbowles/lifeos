package com.spooky.lifeos.android.ui

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

/**
 * Earth-tone palette per the design brief
 * (~/Downloads/LifeOS—Kotlin-JetpackComposeDesign&PrototypeBrief.md §5) — stone, moss, clay,
 * copper, parchment, replacing the session's earlier dark-navy "aurora" palette. Every
 * property name is kept identical to the previous version (`background`, `accent`,
 * `glassSurface`, ...) so the ~15 files across the app that already reference
 * `LifeosColors.foreground` etc. keep compiling unchanged — this is a value swap, not a
 * rename. The "calm computing" color principle from before still applies: full per-domain
 * color is reserved for NOW; TODAY uses one shared muted neutral (see [domainColor] below).
 */
object LifeosColors {
    val background = Color(0xFF0F0F0C) // brief §5 "Background / Night"
    val foreground = Color(0xFFE8DDC9) // brief §5 "Primary Text"
    val accent = Color(0xFFA66B45) // brief §5 "Copper" — primary interactive/selected color
    val surface = Color(0xFF211F19) // brief §5 "Surface"
    val border = Color(0xFF302A22) // brief §5 "Stone"

    // Muted — TODAY's shared neutral avatar treatment.
    val mutedBg = Color(0xFF302A22) // Stone
    val mutedFg = Color(0xFF9D9585) // brief §5 "Muted Text"

    // Due badges — warm rust/gold rather than the old red/amber, but still two distinct,
    // legible "danger" vs "warning" hues so the semantic isn't lost in the narrower palette.
    val overdueBg = Color(0xFF2A1410)
    val overdueFg = Color(0xFFC2593F) // muted rust red
    val dueSoonBg = Color(0xFF2E220E)
    val dueSoonFg = Color(0xFFC29563) // brief §5 "Warm Gold"

    // Life Pulse dot.
    val pulseCalm = Color(0xFF414633) // brief §5 "Dark Moss" — quiet, not gray
    val pulseActive = accent
    val pulseAttention = dueSoonFg
    val pulseUrgent = overdueFg

    // "Frosted" card treatment — translucent stone fill + a warm parchment hairline instead of
    // the old translucent navy + white hairline, so cards read as glass over a landscape
    // rather than glass over a night sky.
    val glassSurface = Color(0x40302A22) // ~25% alpha Stone
    val glassSurfaceElevated = Color(0x59302A22) // ~35% alpha — header/bars, a touch denser
    val glassBorder = Color(0x26D8C7AA) // ~15% alpha Parchment hairline
}

/** One vivid (bg, fg) pair per domain — retinted to earth equivalents of the original web
 *  hues (task=blue→clay, routine=violet→moss, pet=amber→warm gold, financial=emerald→olive,
 *  calendar=indigo→dark moss, sports=orange→copper, grow=green→fresh sage). This is a
 *  deliberate, acknowledged departure from exact web/native color parity — see the redesign
 *  plan's "Design-system decisions" section for the reasoning (saturated blue/violet/emerald
 *  dots would clash with the new palette and undercut the point of the redesign). */
data class DomainColor(val bg: Color, val fg: Color)

private val DOMAIN_COLORS: Map<String, DomainColor> = mapOf(
    "task" to DomainColor(Color(0xFF241A12), Color(0xFFB07C52)), // clay
    "routine" to DomainColor(Color(0xFF1C2016), Color(0xFF8A9468)), // moss
    "pet" to DomainColor(Color(0xFF2C2213), Color(0xFFD9B27C)), // warm gold
    "financial" to DomainColor(Color(0xFF1E2015), Color(0xFF9A9A66)), // olive
    "calendar" to DomainColor(Color(0xFF1B1E19), Color(0xFF7C8570)), // dark moss / slate
    "sports" to DomainColor(Color(0xFF2A1D12), Color(0xFFC08558)), // copper
    "grow" to DomainColor(Color(0xFF17200F), Color(0xFF7FA06B)), // fresh sage — plants read green
)

fun domainColor(domain: String): DomainColor = DOMAIN_COLORS[domain] ?: DomainColor(LifeosColors.mutedBg, LifeosColors.mutedFg)

fun domainLabel(domain: String): String = when (domain) {
    "task" -> "Task"
    "routine" -> "Routine"
    "pet" -> "Pet"
    "financial" -> "Money"
    "calendar" -> "Calendar"
    "sports" -> "Sports"
    "grow" -> "Grow"
    else -> domain.replaceFirstChar { it.uppercase() }
}

fun lifeosDarkColorScheme() = darkColorScheme(
    background = LifeosColors.background,
    surface = LifeosColors.surface,
    primary = LifeosColors.accent,
    onBackground = LifeosColors.foreground,
    onSurface = LifeosColors.foreground,
    outline = LifeosColors.border,
)

package com.spooky.lifeos.android.ui.environment

import java.time.LocalTime

/**
 * Six-bucket successor to the old aurora system's four-bucket `AuroraPhase` (Background.kt,
 * now replaced by EnvironmentalBackground.kt) — per the earth-tone design brief
 * (~/Downloads/LifeOS—Kotlin-JetpackComposeDesign&PrototypeBrief.md §9), which explicitly asks
 * for Dawn/Golden Hour/Dusk as their own distinct moods rather than folding them into the
 * neighboring Morning/Afternoon/Night buckets.
 */
enum class DayPhase {
    DAWN,
    MORNING,
    AFTERNOON,
    GOLDEN_HOUR,
    DUSK,
    NIGHT,
}

/**
 * Independent from `greeting()`'s 3-way split (TodayModels.kt) for the same reason the old
 * `auroraPhase` was — that function only needs "morning/afternoon/evening" wording, the
 * environment wants finer boundaries. The 4s crossfade on phase change
 * (EnvironmentalBackground.kt) means boundaries not lining up exactly with the greeting text
 * doesn't read as inconsistent.
 */
fun dayPhase(time: LocalTime): DayPhase = when (time.hour) {
    in 5 until 7 -> DayPhase.DAWN
    in 7 until 11 -> DayPhase.MORNING
    in 11 until 16 -> DayPhase.AFTERNOON
    in 16 until 18 -> DayPhase.GOLDEN_HOUR
    in 18 until 20 -> DayPhase.DUSK
    else -> DayPhase.NIGHT
}

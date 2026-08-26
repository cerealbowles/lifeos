package com.spooky.lifeos.android.ui

import org.json.JSONObject
import java.time.LocalTime

/**
 * Ports lib/format.ts's greeting() exactly (same three thresholds, same wording) — using the
 * device's local clock rather than a server-stored `user.timezone`, which the Today API
 * response doesn't expose anyway (its one date field is a bare UTC instant). The phone's own
 * timezone already *is* the user's actual current timezone for the overwhelming majority of
 * native-app usage, so there's no real accuracy lost, and no new endpoint/field needed.
 */
fun greeting(now: LocalTime = LocalTime.now()): String = when {
    now.hour < 12 -> "Good morning"
    now.hour < 18 -> "Good afternoon"
    else -> "Good evening"
}

/**
 * Parses GET /api/today's JSON (lib/today/service.ts's TodayOverview, TypeScript source of
 * truth) into what the UI needs. Deliberately thin — the server has already ranked and
 * bucketed everything (lib/today/ranking.ts); this just reads the same shape back out, no
 * re-ranking.
 */
data class TodayItem(
    val id: String,
    val domain: String,
    val title: String,
    val subtitle: String?,
    val dueStatus: String?, // "overdue" | "due_soon" | "upcoming" | "none"
    val daysDelta: Int?, // due-badge.tsx's exact wording ("3d overdue" / "Due in 2d") needs this
    val live: Boolean,
    /** Only set for domain === "pet" — a synthetic "birthday" occurrence (no underlying
     *  pet_events row) can't be completed, matching ranking.ts's RankedItem.eventType. */
    val eventType: String?,
)

data class TodayOverview(
    val pulse: String,
    val glanceSummary: String?,
    val now: List<TodayItem>,
    val today: Map<String, List<TodayItem>>,
)

fun parseTodayOverview(jsonText: String): TodayOverview {
    val root = JSONObject(jsonText)

    fun parseItem(o: JSONObject): TodayItem {
        val due = o.optJSONObject("due")
        return TodayItem(
            id = o.getString("id"),
            domain = o.getString("domain"),
            title = o.getString("title"),
            subtitle = o.optString("subtitle").takeIf { o.has("subtitle") && !o.isNull("subtitle") },
            dueStatus = due?.optString("status"),
            daysDelta = due?.takeIf { it.has("daysDelta") && !it.isNull("daysDelta") }?.optInt("daysDelta"),
            live = o.optBoolean("live", false),
            eventType = o.optString("eventType").takeIf { o.has("eventType") && !o.isNull("eventType") },
        )
    }

    val now = root.optJSONArray("now")?.let { arr ->
        (0 until arr.length()).map { parseItem(arr.getJSONObject(it)) }
    } ?: emptyList()

    val todayObj = root.optJSONObject("today")
    val today = linkedMapOf<String, List<TodayItem>>()
    todayObj?.keys()?.forEach { domain ->
        val arr = todayObj.optJSONArray(domain) ?: return@forEach
        today[domain] = (0 until arr.length()).map { parseItem(arr.getJSONObject(it)) }
    }

    return TodayOverview(
        pulse = root.optString("pulse", "calm"),
        glanceSummary = root.optString("glanceSummary").takeIf { root.has("glanceSummary") && !root.isNull("glanceSummary") },
        now = now,
        today = today,
    )
}

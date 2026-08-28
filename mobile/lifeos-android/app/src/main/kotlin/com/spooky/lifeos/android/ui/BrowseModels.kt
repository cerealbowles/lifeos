package com.spooky.lifeos.android.ui

import org.json.JSONObject

enum class BrowseDomain(val label: String, val path: String, val jsonKey: String) {
    PET("Pets", "/api/pets", "pets"),
    GROW("Grow", "/api/grow", "plants"),
    FINANCIAL("Money", "/api/finance/reminders", "reminders"),
    ROUTINE("Routines", "/api/routines", "routines"),
    // jsonKey unused for CALENDAR/SPORTS — see parseBrowseRows, both need custom shapes
    // (a windowed agenda query param, and a nested favorites-per-sport-group structure).
    CALENDAR("Calendar", "/api/calendar/events", "events"),
    SPORTS("Sports", "/api/sports/games", ""),
    NOTES("Notes", "/api/notes", "notes"),
    LISTS("Lists", "/api/lists", "lists"),
    MOMENTS("Moments", "/api/moments", "moments"),
    CHALLENGES("Challenges", "/api/challenges", "challenges"),
    ACCOUNTS("Accounts", "/api/finance/accounts", "accounts"),
    FEED("Feeds", "/api/feed/subscriptions", "subscriptions"),
}

/**
 * One row's worth of display data, normalized across all six domains rather than six separate
 * model classes — a browse row only ever needs a title/subtitle/status, and each domain's real
 * shape (Pet/Plant/Reminder/Routine/CalendarEvent/GameDTO) has a natural, if different, mapping
 * onto that. Parsed straight from each endpoint's real JSON shape (lib/pets|growing|finance|
 * tasks|calendar|sports/service.ts's return types), not re-derived independently.
 *
 * `raw` keeps the full source JSON object (as text) alongside the trimmed display fields —
 * every domain's list endpoint already returns the full record (confirmed by reading each
 * service function: none of them project columns), so a detail screen can re-parse whatever
 * extra fields it needs from `raw` without a second network round-trip.
 */
data class BrowseRow(val id: String, val title: String, val subtitle: String, val inactive: Boolean, val raw: String)

/**
 * Shared-element key for a row ↔ its detail screen (BrowseDetailScreens.kt) — one function so
 * the two call sites (the collapsed row in BrowseScreen.kt, the expanded screen itself) can
 * never drift out of sync with each other.
 */
fun browseSharedKey(domain: BrowseDomain, id: String): String = "browse-${domain.name.lowercase()}-$id"

fun parseBrowseRows(domain: BrowseDomain, jsonText: String): List<BrowseRow> {
    if (domain == BrowseDomain.SPORTS) return parseSportsRows(jsonText)

    val arr = JSONObject(jsonText).getJSONArray(domain.jsonKey)
    return (0 until arr.length()).map { i ->
        val o = arr.getJSONObject(i)
        when (domain) {
            BrowseDomain.SPORTS -> error("handled above")
            BrowseDomain.CALENDAR -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("title"),
                subtitle = listOfNotNull(
                    o.optString("startAt").takeIf { o.has("startAt") && !o.isNull("startAt") }?.replace("T", " ")?.take(16),
                    o.optString("location").takeIf { it.isNotBlank() && !o.isNull("location") },
                ).joinToString(" · "),
                inactive = o.optString("status") == "cancelled",
                raw = o.toString(),
            )
            BrowseDomain.PET -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = listOfNotNull(o.optString("species").takeIf { it.isNotBlank() }, o.optString("breed").takeIf { it.isNotBlank() && !o.isNull("breed") })
                    .joinToString(" · "),
                inactive = !o.optBoolean("active", true),
                raw = o.toString(),
            )
            BrowseDomain.GROW -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("strain"),
                subtitle = o.getString("stage").replaceFirstChar { it.uppercase() },
                inactive = !o.optBoolean("active", true),
                raw = o.toString(),
            )
            BrowseDomain.FINANCIAL -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = buildString {
                    val amount = o.optString("amount").takeIf { o.has("amount") && !o.isNull("amount") }
                    if (amount != null) append("$$amount")
                    val nextDue = o.optString("nextDueAt").takeIf { o.has("nextDueAt") && !o.isNull("nextDueAt") }
                    if (nextDue != null) {
                        if (isNotEmpty()) append(" · ")
                        append("Due ${nextDue.take(10)}")
                    }
                    if (o.optBoolean("autopay", false)) {
                        if (isNotEmpty()) append(" · ")
                        append("Autopay")
                    }
                },
                inactive = false,
                raw = o.toString(),
            )
            BrowseDomain.ROUTINE -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = listOfNotNull(
                    o.optString("category").takeIf { it.isNotBlank() && !o.isNull("category") },
                    o.optString("nextDueAt").takeIf { o.has("nextDueAt") && !o.isNull("nextDueAt") }?.let { "Next ${it.take(10)}" },
                ).joinToString(" · "),
                inactive = !o.optBoolean("active", true),
                raw = o.toString(),
            )
            BrowseDomain.NOTES -> BrowseRow(
                id = o.getString("id"),
                title = o.optString("title").takeIf { it.isNotBlank() } ?: "Untitled",
                subtitle = o.optString("body").takeIf { it.isNotBlank() && !o.isNull("body") }?.replace("\n", " ")?.take(80) ?: "",
                inactive = false,
                raw = o.toString(),
            )
            BrowseDomain.LISTS -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = "",
                inactive = false,
                raw = o.toString(),
            )
            BrowseDomain.MOMENTS -> BrowseRow(
                id = o.getString("id"),
                title = o.optString("caption").takeIf { it.isNotBlank() && !o.isNull("caption") } ?: "Moment",
                subtitle = listOfNotNull(
                    o.optString("occurredAt").takeIf { o.has("occurredAt") && !o.isNull("occurredAt") }?.replace("T", " ")?.take(16),
                    o.optString("location").takeIf { it.isNotBlank() && !o.isNull("location") },
                ).joinToString(" · "),
                inactive = false,
                raw = o.toString(),
            )
            BrowseDomain.CHALLENGES -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = listOfNotNull(
                    o.optString("status").takeIf { it.isNotBlank() && !o.isNull("status") }?.replaceFirstChar { c -> c.uppercase() },
                ).joinToString(" · "),
                inactive = o.optString("status") == "abandoned",
                raw = o.toString(),
            )
            BrowseDomain.ACCOUNTS -> BrowseRow(
                id = o.getString("id"),
                title = o.getString("name"),
                subtitle = listOfNotNull(
                    o.optString("accountType").takeIf { it.isNotBlank() },
                    o.optString("institution").takeIf { it.isNotBlank() && !o.isNull("institution") },
                    o.optString("lastFour").takeIf { it.isNotBlank() && !o.isNull("lastFour") }?.let { "····$it" },
                ).joinToString(" · "),
                inactive = false,
                raw = o.toString(),
            )
            BrowseDomain.FEED -> BrowseRow(
                id = o.getString("id"),
                title = o.optString("title").takeIf { it.isNotBlank() && !o.isNull("title") } ?: o.getString("feedUrl"),
                subtitle = o.optString("siteUrl").takeIf { it.isNotBlank() && !o.isNull("siteUrl") } ?: o.getString("feedUrl"),
                inactive = false,
                raw = o.toString(),
            )
        }
    }
}

/**
 * getGamesGrouped's response nests games inside `groups[].favorites[]`/`others[]` (one group
 * per followed sport) rather than one flat array — mirrors lib/sports/types.ts's
 * SportGroupDTO/GameDTO. Only `favorites` is shown here (a followed team's own games), same
 * as what feeds the Today "sports" domain (DECISIONS.md ADR-036) — `others` is the wider
 * league schedule, not something Browse's per-domain glance needs. GameDTO has no id field,
 * so the row key is synthesized from the fields that make a game unique.
 */
private fun parseSportsRows(jsonText: String): List<BrowseRow> {
    val root = JSONObject(jsonText)
    if (!root.optBoolean("configured", false)) return emptyList()
    val groups = root.optJSONArray("groups") ?: return emptyList()

    val rows = mutableListOf<BrowseRow>()
    for (g in 0 until groups.length()) {
        val group = groups.getJSONObject(g)
        val favorites = group.optJSONArray("favorites") ?: continue
        for (i in 0 until favorites.length()) {
            val game = favorites.getJSONObject(i)
            val home = game.getString("homeTeam")
            val away = game.getString("awayTeam")
            val status = game.getString("status")
            val startAt = game.optString("startAt").takeIf { game.has("startAt") && !game.isNull("startAt") }
            val homeScore = game.optInt("homeScore", -1).takeIf { it >= 0 }
            val awayScore = game.optInt("awayScore", -1).takeIf { it >= 0 }
            rows.add(
                BrowseRow(
                    id = "$away-at-$home-${startAt ?: status}",
                    title = "$away @ $home",
                    subtitle = if (homeScore != null && awayScore != null) {
                        "$away $awayScore – $homeScore $home · $status"
                    } else {
                        listOfNotNull(startAt?.replace("T", " ")?.take(16), status).joinToString(" · ")
                    },
                    inactive = status == "Final",
                    raw = game.toString(),
                ),
            )
        }
    }
    return rows
}

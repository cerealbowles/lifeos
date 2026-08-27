package com.spooky.lifeos.android.ui

import org.json.JSONObject

data class BoxscoreBatter(
    val name: String,
    val pos: String,
    val ab: Int,
    val r: Int,
    val h: Int,
    val rbi: Int,
    val bb: Int,
    val so: Int,
)

data class BoxscorePitcher(
    val name: String,
    val ip: String,
    val h: Int,
    val r: Int,
    val er: Int,
    val bb: Int,
    val so: Int,
)

data class BoxscoreSide(
    val abbr: String,
    val batters: List<BoxscoreBatter>,
    val pitchers: List<BoxscorePitcher>,
)

data class Boxscore(
    val away: BoxscoreSide,
    val home: BoxscoreSide,
)

/**
 * Parses GET /api/sports/games/mlb/{gamePk}/boxscore's JSON (lib/sports/betting-client.ts's
 * `Boxscore`, TypeScript source of truth) — same fields as components/sports/boxscore-panel.tsx.
 */
fun parseBoxscore(jsonText: String): Boxscore {
    val root = JSONObject(jsonText)

    fun parseSide(o: JSONObject): BoxscoreSide {
        val battersArr = o.optJSONArray("batters")
        val batters = (0 until (battersArr?.length() ?: 0)).map { i ->
            val b = battersArr!!.getJSONObject(i)
            BoxscoreBatter(
                name = b.getString("name"),
                pos = b.getString("pos"),
                ab = b.optInt("ab"),
                r = b.optInt("r"),
                h = b.optInt("h"),
                rbi = b.optInt("rbi"),
                bb = b.optInt("bb"),
                so = b.optInt("so"),
            )
        }
        val pitchersArr = o.optJSONArray("pitchers")
        val pitchers = (0 until (pitchersArr?.length() ?: 0)).map { i ->
            val p = pitchersArr!!.getJSONObject(i)
            BoxscorePitcher(
                name = p.getString("name"),
                ip = p.getString("ip"),
                h = p.optInt("h"),
                r = p.optInt("r"),
                er = p.optInt("er"),
                bb = p.optInt("bb"),
                so = p.optInt("so"),
            )
        }
        return BoxscoreSide(abbr = o.getString("abbr"), batters = batters, pitchers = pitchers)
    }

    return Boxscore(
        away = parseSide(root.getJSONObject("away")),
        home = parseSide(root.getJSONObject("home")),
    )
}

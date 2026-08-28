package com.spooky.lifeos.android.ui

/**
 * Exact port of lib/sports/teams.ts's static team list — the web app imports this directly
 * client-side rather than serving it over the network (it's a closed, rarely-changing set), so
 * the same reasoning applies here: no endpoint to call, just a matching static table.
 */
data class SportOption(val key: String, val label: String)

data class TeamOption(val abbr: String, val name: String)

val SPORT_OPTIONS = listOf(SportOption("mlb", "MLB"), SportOption("nfl", "NFL"))

private val MLB_TEAMS = listOf(
    TeamOption("BAL", "Baltimore Orioles"),
    TeamOption("BOS", "Boston Red Sox"),
    TeamOption("NYY", "New York Yankees"),
    TeamOption("TB", "Tampa Bay Rays"),
    TeamOption("TOR", "Toronto Blue Jays"),
    TeamOption("CWS", "Chicago White Sox"),
    TeamOption("CLE", "Cleveland Guardians"),
    TeamOption("DET", "Detroit Tigers"),
    TeamOption("KC", "Kansas City Royals"),
    TeamOption("MIN", "Minnesota Twins"),
    TeamOption("HOU", "Houston Astros"),
    TeamOption("LAA", "Los Angeles Angels"),
    TeamOption("ATH", "Athletics"),
    TeamOption("SEA", "Seattle Mariners"),
    TeamOption("TEX", "Texas Rangers"),
    TeamOption("ATL", "Atlanta Braves"),
    TeamOption("MIA", "Miami Marlins"),
    TeamOption("NYM", "New York Mets"),
    TeamOption("PHI", "Philadelphia Phillies"),
    TeamOption("WSH", "Washington Nationals"),
    TeamOption("CHC", "Chicago Cubs"),
    TeamOption("CIN", "Cincinnati Reds"),
    TeamOption("MIL", "Milwaukee Brewers"),
    TeamOption("PIT", "Pittsburgh Pirates"),
    TeamOption("STL", "St. Louis Cardinals"),
    TeamOption("ARI", "Arizona Diamondbacks"),
    TeamOption("COL", "Colorado Rockies"),
    TeamOption("LAD", "Los Angeles Dodgers"),
    TeamOption("SD", "San Diego Padres"),
    TeamOption("SF", "San Francisco Giants"),
)

private val NFL_TEAMS = listOf(
    TeamOption("BUF", "Buffalo Bills"),
    TeamOption("MIA", "Miami Dolphins"),
    TeamOption("NE", "New England Patriots"),
    TeamOption("NYJ", "New York Jets"),
    TeamOption("BAL", "Baltimore Ravens"),
    TeamOption("CIN", "Cincinnati Bengals"),
    TeamOption("CLE", "Cleveland Browns"),
    TeamOption("PIT", "Pittsburgh Steelers"),
    TeamOption("HOU", "Houston Texans"),
    TeamOption("IND", "Indianapolis Colts"),
    TeamOption("JAX", "Jacksonville Jaguars"),
    TeamOption("TEN", "Tennessee Titans"),
    TeamOption("DEN", "Denver Broncos"),
    TeamOption("KC", "Kansas City Chiefs"),
    TeamOption("LV", "Las Vegas Raiders"),
    TeamOption("LAC", "Los Angeles Chargers"),
    TeamOption("DAL", "Dallas Cowboys"),
    TeamOption("NYG", "New York Giants"),
    TeamOption("PHI", "Philadelphia Eagles"),
    TeamOption("WSH", "Washington Commanders"),
    TeamOption("CHI", "Chicago Bears"),
    TeamOption("DET", "Detroit Lions"),
    TeamOption("GB", "Green Bay Packers"),
    TeamOption("MIN", "Minnesota Vikings"),
    TeamOption("ATL", "Atlanta Falcons"),
    TeamOption("CAR", "Carolina Panthers"),
    TeamOption("NO", "New Orleans Saints"),
    TeamOption("TB", "Tampa Bay Buccaneers"),
    TeamOption("ARI", "Arizona Cardinals"),
    TeamOption("LAR", "Los Angeles Rams"),
    TeamOption("SF", "San Francisco 49ers"),
    TeamOption("SEA", "Seattle Seahawks"),
)

fun listTeamsForSport(sport: String): List<TeamOption> = when (sport) {
    "mlb" -> MLB_TEAMS
    "nfl" -> NFL_TEAMS
    else -> emptyList()
}

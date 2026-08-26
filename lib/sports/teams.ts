// Client-safe (no "server-only") — shared between the browser (Settings form) and
// lib/sports/service.ts. Replaces the old ESPN team-search API entirely: sports-betting
// (lib/sports/betting-client.ts) has no team-search endpoint, just fixed abbreviations, so a
// static list is both simpler and more reliable than a live search call ever was.

export const SPORT_OPTIONS = [
  { key: "mlb", label: "MLB" },
  { key: "nfl", label: "NFL" },
] as const;

export type SportKey = (typeof SPORT_OPTIONS)[number]["key"];

export type TeamOption = { abbr: string; name: string };

const MLB_TEAMS: TeamOption[] = [
  { abbr: "BAL", name: "Baltimore Orioles" },
  { abbr: "BOS", name: "Boston Red Sox" },
  { abbr: "NYY", name: "New York Yankees" },
  { abbr: "TB", name: "Tampa Bay Rays" },
  { abbr: "TOR", name: "Toronto Blue Jays" },
  { abbr: "CWS", name: "Chicago White Sox" },
  { abbr: "CLE", name: "Cleveland Guardians" },
  { abbr: "DET", name: "Detroit Tigers" },
  { abbr: "KC", name: "Kansas City Royals" },
  { abbr: "MIN", name: "Minnesota Twins" },
  { abbr: "HOU", name: "Houston Astros" },
  { abbr: "LAA", name: "Los Angeles Angels" },
  { abbr: "ATH", name: "Athletics" },
  { abbr: "SEA", name: "Seattle Mariners" },
  { abbr: "TEX", name: "Texas Rangers" },
  { abbr: "ATL", name: "Atlanta Braves" },
  { abbr: "MIA", name: "Miami Marlins" },
  { abbr: "NYM", name: "New York Mets" },
  { abbr: "PHI", name: "Philadelphia Phillies" },
  { abbr: "WSH", name: "Washington Nationals" },
  { abbr: "CHC", name: "Chicago Cubs" },
  { abbr: "CIN", name: "Cincinnati Reds" },
  { abbr: "MIL", name: "Milwaukee Brewers" },
  { abbr: "PIT", name: "Pittsburgh Pirates" },
  { abbr: "STL", name: "St. Louis Cardinals" },
  { abbr: "ARI", name: "Arizona Diamondbacks" },
  { abbr: "COL", name: "Colorado Rockies" },
  { abbr: "LAD", name: "Los Angeles Dodgers" },
  { abbr: "SD", name: "San Diego Padres" },
  { abbr: "SF", name: "San Francisco Giants" },
];

const NFL_TEAMS: TeamOption[] = [
  { abbr: "BUF", name: "Buffalo Bills" },
  { abbr: "MIA", name: "Miami Dolphins" },
  { abbr: "NE", name: "New England Patriots" },
  { abbr: "NYJ", name: "New York Jets" },
  { abbr: "BAL", name: "Baltimore Ravens" },
  { abbr: "CIN", name: "Cincinnati Bengals" },
  { abbr: "CLE", name: "Cleveland Browns" },
  { abbr: "PIT", name: "Pittsburgh Steelers" },
  { abbr: "HOU", name: "Houston Texans" },
  { abbr: "IND", name: "Indianapolis Colts" },
  { abbr: "JAX", name: "Jacksonville Jaguars" },
  { abbr: "TEN", name: "Tennessee Titans" },
  { abbr: "DEN", name: "Denver Broncos" },
  { abbr: "KC", name: "Kansas City Chiefs" },
  { abbr: "LV", name: "Las Vegas Raiders" },
  { abbr: "LAC", name: "Los Angeles Chargers" },
  { abbr: "DAL", name: "Dallas Cowboys" },
  { abbr: "NYG", name: "New York Giants" },
  { abbr: "PHI", name: "Philadelphia Eagles" },
  { abbr: "WSH", name: "Washington Commanders" },
  { abbr: "CHI", name: "Chicago Bears" },
  { abbr: "DET", name: "Detroit Lions" },
  { abbr: "GB", name: "Green Bay Packers" },
  { abbr: "MIN", name: "Minnesota Vikings" },
  { abbr: "ATL", name: "Atlanta Falcons" },
  { abbr: "CAR", name: "Carolina Panthers" },
  { abbr: "NO", name: "New Orleans Saints" },
  { abbr: "TB", name: "Tampa Bay Buccaneers" },
  { abbr: "ARI", name: "Arizona Cardinals" },
  { abbr: "LAR", name: "Los Angeles Rams" },
  { abbr: "SF", name: "San Francisco 49ers" },
  { abbr: "SEA", name: "Seattle Seahawks" },
];

const TEAMS_BY_SPORT: Record<SportKey, TeamOption[]> = {
  mlb: MLB_TEAMS,
  nfl: NFL_TEAMS,
};

export function listTeams(sport: string): TeamOption[] {
  return TEAMS_BY_SPORT[sport as SportKey] ?? [];
}

export function getTeam(sport: string, abbr: string): TeamOption | null {
  return listTeams(sport).find((t) => t.abbr === abbr) ?? null;
}

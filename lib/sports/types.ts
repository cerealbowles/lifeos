import type { BettingGameStatus, BettingSport } from "./betting-client";

export type FavoriteTeamDTO = {
  id: string;
  sport: string;
  teamAbbr: string;
  teamName: string;
};

export type GameOddsDTO = {
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  totalLine: number | null;
  overOdds: number | null;
  underOdds: number | null;
};

export type GameDTO = {
  sport: BettingSport;
  homeTeam: string;
  awayTeam: string;
  status: BettingGameStatus;
  homeScore: number | null;
  awayScore: number | null;
  period: string | null;
  startAt: string | null;
  odds: GameOddsDTO | null;
  isFavorite: boolean;
};

export type SportGroupDTO = {
  sport: BettingSport;
  label: string;
  favorites: GameDTO[];
  others: GameDTO[];
};

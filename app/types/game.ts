export interface Game {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    full_name: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    abbreviation: string;
    full_name: string;
  };
  visitor_team_score: number;
  played: boolean;
  status?: string;
  time?: string;
  period?: number;
  stats: {
    pts: number;
    reb: number;
    ast: number;
    stl?: number;
    blk?: number;
    min?: string;
    fgm?: number;
    fga?: number;
    fg3m?: number;
    fg3a?: number;
    ftm?: number;
    fta?: number;
  } | null;
}

export interface Team {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

export interface GameResponse {
  data: Game[];
  meta: {
    next_cursor?: number;
    per_page: number;
  };
} 
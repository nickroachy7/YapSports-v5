"use client";

import { useState, useEffect } from 'react';

interface Game {
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

interface Player {
  first_name: string;
  last_name: string;
  position: string;
  team: {
    id: number;
    full_name: string;
  };
  jersey_number?: string;
  season_averages?: {
    ppg: number;
    rpg: number;
    apg: number;
    fg_pct: number;
    fg3_pct: number;
    ft_pct: number;
    spg: number;
    bpg: number;
  };
}

interface PlayerGameStatusProps {
  player: Player;
  recentGames: Game[];
}

export default function PlayerGameStatus({ player, recentGames = [] }: PlayerGameStatusProps) {
  const [relevantGame, setRelevantGame] = useState<Game | null>(null);
  const [gameStatus, setGameStatus] = useState<'live' | 'recent' | 'upcoming' | null>(null);

  // This effect will determine the most relevant game to display
  useEffect(() => {
    if (!recentGames || recentGames.length === 0) return;

    const now = new Date();
    
    // Find a live game first
    const liveGame = recentGames.find(game => 
      isGameLive(game)
    );

    if (liveGame) {
      setRelevantGame(liveGame);
      setGameStatus('live');
      return;
    }

    // Find the most recently completed game (within 3 hours)
    const recentlyCompletedGames = recentGames
      .filter(game => isGameFinished(game))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (recentlyCompletedGames.length > 0) {
      const mostRecent = recentlyCompletedGames[0];
      const gameEndTime = new Date(mostRecent.date);
      // Assuming game length of ~2.5 hours on average
      gameEndTime.setHours(gameEndTime.getHours() + 2.5);
      
      // If the game ended within the last 3 hours
      const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      if (gameEndTime > threeHoursAgo) {
        setRelevantGame(mostRecent);
        setGameStatus('recent');
        return;
      }
    }

    // Otherwise, find the next upcoming game
    const upcomingGames = recentGames
      .filter(game => !isGameLive(game) && !isGameFinished(game))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (upcomingGames.length > 0) {
      setRelevantGame(upcomingGames[0]);
      setGameStatus('upcoming');
      return;
    }

    // If no relevant game found
    setRelevantGame(null);
    setGameStatus(null);
  }, [recentGames]);

  // Function to determine if a game is live
  const isGameLive = (game: Game): boolean => {
    // If period > 0 and there's no final result yet, the game is live
    return (game.period && game.period > 0 && game.status !== "Final") || 
           (typeof game.status === 'string' && game.status.toLowerCase().includes('live'));
  };

  // Function to determine if a game is finished
  const isGameFinished = (game: Game): boolean => {
    return game.status === "Final" || 
           (typeof game.status === 'string' && game.status.toLowerCase().includes('final')) ||
           (game.played && (game.home_team_score > 0 || game.visitor_team_score > 0));
  };

  // Function to format period display
  const formatPeriod = (period?: number): string => {
    if (!period) return '';
    if (period <= 4) return `Q${period}`;
    return period === 5 ? 'OT' : `${period-4}OT`; // OT, 2OT, 3OT etc.
  };

  // Format game time for display
  const formatGameTime = (dateString?: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      }) + ' ET';
    } catch (error) {
      return 'Time TBD';
    }
  };

  // Helper function to format game date
  const formatGameDate = (dateString: string): string => {
    try {
      const rawGameDate = dateString;
      
      if (rawGameDate.includes('-')) {
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1;
          const day = parseInt(gameDateParts[2]);
          
          const gameDate = new Date(Date.UTC(year, month, day));
          
          return gameDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
          });
        }
      }
      
      const gameDate = new Date(rawGameDate);
      return gameDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error(`Error formatting date ${dateString}:`, error);
      return "N/A";
    }
  };

  if (!relevantGame || !gameStatus) return null;
  
  const isHome = player?.team?.id === relevantGame.home_team.id;
  const playerTeam = isHome ? relevantGame.home_team : relevantGame.visitor_team;
  const opponentTeam = isHome ? relevantGame.visitor_team : relevantGame.home_team;
  const playerTeamScore = isHome ? relevantGame.home_team_score : relevantGame.visitor_team_score;
  const opponentTeamScore = isHome ? relevantGame.visitor_team_score : relevantGame.home_team_score;
  
  // Live game display
  if (gameStatus === 'live') {
    return (
      <div className="mt-1 bg-charcoal-800 rounded-lg p-2 w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center">
            <span className="h-2 w-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
            <span className="text-red-500 text-xs font-semibold">LIVE</span>
          </div>
          <div className="text-xs text-grey-400">
            {formatPeriod(relevantGame.period)} {relevantGame.time && `• ${relevantGame.time}`}
          </div>
        </div>
        
        <div className="flex justify-between text-xs mb-1">
          <div className="font-semibold text-white">{playerTeam.abbreviation}</div>
          <div className="text-white">{playerTeamScore}</div>
        </div>
        
        <div className="flex justify-between text-xs mb-2">
          <div className="font-semibold text-white">{opponentTeam.abbreviation}</div>
          <div className="text-white">{opponentTeamScore}</div>
        </div>
        
        {relevantGame.stats && (
          <div className="flex justify-between bg-charcoal-700 rounded-md p-1 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-grey-500">PTS</span>
              <span className="text-white font-semibold">{relevantGame.stats.pts || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">REB</span>
              <span className="text-white font-semibold">{relevantGame.stats.reb || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">AST</span>
              <span className="text-white font-semibold">{relevantGame.stats.ast || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">STL</span>
              <span className="text-white font-semibold">{relevantGame.stats.stl || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">BLK</span>
              <span className="text-white font-semibold">{relevantGame.stats.blk || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Recent game display (finished within 3 hours)
  if (gameStatus === 'recent') {
    // Determine who won for styling
    const playerTeamWon = playerTeamScore > opponentTeamScore;
    const statusClass = playerTeamWon ? 'text-green-500' : 'text-red-500';
    const result = playerTeamWon ? 'W' : 'L';
    
    return (
      <div className="mt-1 bg-charcoal-800 rounded-lg p-2 w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center">
            <span className={`font-semibold text-xs ${statusClass}`}>FINAL • {result}</span>
          </div>
          <div className="text-xs text-grey-400">
            {formatGameDate(relevantGame.date)}
          </div>
        </div>
        
        <div className="flex justify-between text-xs mb-1">
          <div className="font-semibold text-white">{playerTeam.abbreviation}</div>
          <div className="text-white">{playerTeamScore}</div>
        </div>
        
        <div className="flex justify-between text-xs mb-2">
          <div className="font-semibold text-white">{opponentTeam.abbreviation}</div>
          <div className="text-white">{opponentTeamScore}</div>
        </div>
        
        {relevantGame.stats && (
          <div className="flex justify-between bg-charcoal-700 rounded-md p-1 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-grey-500">PTS</span>
              <span className="text-white font-semibold">{relevantGame.stats.pts || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">REB</span>
              <span className="text-white font-semibold">{relevantGame.stats.reb || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">AST</span>
              <span className="text-white font-semibold">{relevantGame.stats.ast || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">STL</span>
              <span className="text-white font-semibold">{relevantGame.stats.stl || 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-grey-500">BLK</span>
              <span className="text-white font-semibold">{relevantGame.stats.blk || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Upcoming game display
  if (gameStatus === 'upcoming') {
    return (
      <div className="mt-1 bg-charcoal-800 rounded-lg p-2 w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs text-blue-400 font-semibold">NEXT GAME</div>
          <div className="text-xs text-grey-400">
            {formatGameDate(relevantGame.date)}
          </div>
        </div>
        
        <div className="flex justify-center items-center py-1 mb-1">
          <div className="font-semibold text-sm text-white mr-2">{playerTeam.abbreviation}</div>
          <div className="text-xs text-grey-500 mx-1">vs</div>
          <div className="font-semibold text-sm text-white ml-2">{opponentTeam.abbreviation}</div>
        </div>
        
        <div className="text-center text-xs text-grey-400">
          {formatGameTime(relevantGame.date)}
        </div>
      </div>
    );
  }
  
  return null;
} 
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Player } from '../../types/player';
import GameLog from '../../components/player/GameLog';
import NextGame from '../../components/player/NextGame';

interface SeasonAverages {
  games_played: number;
  player_id: number;
  season: number;
  min: string;
  fgm: number;
  fga: number;
  fg_pct: number;
  fg3m: number;
  fg3a: number;
  fg3_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
}

interface GameStats {
  game: { id: number };
  min: string;
  fgm: number;
  fga: number;
  fg_pct: number;
  fg3m: number;
  fg3a: number;
  fg3_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
}

interface Game {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  visitor_team_score: number;
  played: boolean;
  stats: GameStats | null;
  needsRecentCheck?: boolean;
}

interface PlayerDetails {
  player: Player;
  seasonAverages: SeasonAverages | null;
  games: Game[];
}

export default function PlayerProfile() {
  const params = useParams();
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function used for auto-refresh logic
  const isGameEffectivelyPlayed = (game: Game): boolean => {
    try {
      const rawGameDate = game.date;
      if (rawGameDate.includes('-')) {
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1;
          const day = parseInt(gameDateParts[2]);
          
          const gameDate = new Date(Date.UTC(year, month, day));
          const now = new Date();
          const today = new Date(Date.UTC(
            now.getFullYear(),
            now.getMonth(), 
            now.getDate()
          ));
          
          const datePassed = gameDate < today;
          const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
          return (game.played && datePassed) || (datePassed && hasScores);
        }
      }
      return game.played;
    } catch (error) {
      console.error(`Error determining if game ${game.id} is played:`, error);
      return game.played;
    }
  };

  const fetchPlayerDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/players/${params.id}`);
      
      // Log response status to help debug
      console.log(`API response status for player ${params.id}:`, response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Player data received:', data);
      console.log('Raw player object:', JSON.stringify(data.player, null, 2));
      
      // Validate data before setting state
      if (!data.player) {
        throw new Error('Player data is missing in the API response');
      }
      
      setPlayerDetails(data);
    } catch (err) {
      console.error('Error fetching player details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load player details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchPlayerDetails();
    }
  }, [params.id]);

  // Auto-refresh when the page loads if there are games with 0-0 scores that need refresh
  useEffect(() => {
    // Check if we have player details and games with 0-0 scores that need refresh
    if (playerDetails && playerDetails.games) {
      // Find games that are effectively played but have 0-0 scores
      const gamesNeedingRefresh = playerDetails.games.filter(g => 
        (isGameEffectivelyPlayed(g) && g.home_team_score === 0 && g.visitor_team_score === 0) ||
        // Also include any very recent games marked for checking by the backend
        g.needsRecentCheck === true
      );
      
      // Only do an auto-refresh if we still have games with TBD stats after the initial load
      if (gamesNeedingRefresh.length > 0) {
        console.log(`${gamesNeedingRefresh.length} games still need refresh after initial load - will attempt refresh once`);
        // We'll use a timeout to let the UI render first before triggering the refresh
        const refreshTimer = setTimeout(() => {
          console.log('Executing delayed auto-refresh for any remaining games with 0-0 scores');
          refreshGameStats();
        }, 3000); // 3 second delay to let initial UI render
        
        return () => clearTimeout(refreshTimer);
      }
    }
  }, [playerDetails?.player?.id]); // Only run when the player ID changes or when initially loaded

  // Function to refresh game stats for games that have been played
  const refreshGameStats = async () => {
    if (!playerDetails || !params.id) return;
    
    try {
      const response = await fetch(`/api/players/${params.id}/refresh-stats`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh stats: ${response.status}`);
      }
      
      const data = await response.json();
      setPlayerDetails(prevDetails => {
        if (!prevDetails) return data;
        
        return {
          ...prevDetails,
          games: data.games || prevDetails.games
        };
      });
      
    } catch (err) {
      console.error('Error refreshing game stats:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal-800 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-pulse flex space-x-4 justify-center">
              <div className="rounded-full bg-charcoal-700 h-12 w-12"></div>
              <div className="flex-1 space-y-4 max-w-md">
                <div className="h-4 bg-charcoal-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-charcoal-700 rounded"></div>
                  <div className="h-4 bg-charcoal-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-grey-600">Loading player details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !playerDetails) {
    return (
      <div className="min-h-screen bg-charcoal-800 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-grey-500 mb-4">Error</h2>
            <p className="text-grey-600">{error || 'Failed to load player details'}</p>
            <Link href="/" className="mt-4 inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Safely extract player and seasonAverages from playerDetails
  const player = playerDetails?.player;
  const seasonAverages = playerDetails?.seasonAverages;
  const games = playerDetails?.games || [];
  
  // Add a helper function to safely access nested properties
  const getPlayerProperty = (obj: any, path: string, defaultValue: any = 'N/A') => {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === undefined || current === null) {
          return defaultValue;
        }
        current = current[key];
      }
      
      // Handle empty strings, 0 values appropriately
      if (current === undefined || current === null || current === '') {
        return defaultValue;
      }
      
      // For numeric values, ensure 0 is displayed as 0, not defaultValue
      if (typeof current === 'number') {
        return current;
      }
      
      return current || defaultValue;
    } catch (error) {
      console.error(`Error accessing property ${path}:`, error);
      return defaultValue;
    }
  };

  // Helper for safely getting initials
  const getInitial = (value: string) => {
    try {
      return value && typeof value === 'string' && value.length > 0 ? value.charAt(0) : '';
    } catch (error) {
      console.error(`Error getting initial for ${value}:`, error);
      return '';
    }
  };
  
  console.log('Rendering with player:', player);
  console.log('Player data type:', typeof player);
  console.log('Player properties:', player ? Object.keys(player) : 'No player data');
  
  // Log specific fields we're interested in
  console.log('Player height_feet:', getPlayerProperty(player, 'height_feet', 'not found'));
  console.log('Player height_inches:', getPlayerProperty(player, 'height_inches', 'not found'));
  console.log('Player height:', getPlayerProperty(player, 'height', 'not found'));
  console.log('Player weight_pounds:', getPlayerProperty(player, 'weight_pounds', 'not found'));
  console.log('Player weight:', getPlayerProperty(player, 'weight', 'not found'));
  console.log('Player jersey_number:', getPlayerProperty(player, 'jersey_number', 'not found'));
  console.log('Player college:', getPlayerProperty(player, 'college', 'not found'));
  
  if (player?.team) {
    console.log('Team properties:', Object.keys(player.team));
  }
  console.log('Rendering with seasonAverages:', seasonAverages);

  return (
    <div className="min-h-screen bg-charcoal-800 pt-20">
      {/* Back button - fixed position in top left */}
      <div className="fixed top-[100px] left-[28px] z-50">
        <Link href="/" className="inline-flex items-center justify-center w-8 h-8 bg-charcoal-700 rounded-full hover:bg-charcoal-600 transition-colors shadow-md" title="Return to Home">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-grey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      <div className="container mx-auto px-4 py-8 relative">
        {/* Next Game Component */}
        {player && <NextGame player={player} />}

        {/* Player Profile Header */}
        {player ? (
          <div className="bg-charcoal-700 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Player Avatar Placeholder */}
              <div className="w-24 h-24 bg-charcoal-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-grey-500">
                  {getInitial(getPlayerProperty(player, 'first_name', ''))}
                  {getInitial(getPlayerProperty(player, 'last_name', ''))}
                </span>
              </div>
              
              {/* Player Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-grey-400 mb-2">
                  {getPlayerProperty(player, 'first_name')} {getPlayerProperty(player, 'last_name')}
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-grey-600">
                  <div>
                    <span className="font-semibold block text-grey-500">Team</span>
                    <span>
                      {getPlayerProperty(player, 'team.full_name') ||
                       (getPlayerProperty(player, 'team.city') && getPlayerProperty(player, 'team.name') 
                         ? `${getPlayerProperty(player, 'team.city')} ${getPlayerProperty(player, 'team.name')}` 
                         : 'N/A')}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">Position</span>
                    <span>{getPlayerProperty(player, 'position')}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">Jersey #</span>
                    <span>{getPlayerProperty(player, 'jersey_number')}</span>
                  </div>

                  <div>
                    <span className="font-semibold block text-grey-500">Height</span>
                    <span>
                      {(() => {
                        const feet = getPlayerProperty(player, 'height_feet', null);
                        const inches = getPlayerProperty(player, 'height_inches', null);
                        
                        if (feet !== null && feet !== 'N/A' && inches !== null && inches !== 'N/A') {
                          return `${feet}'${inches}"`;
                        }
                        // Check for other possible height formats
                        const height = getPlayerProperty(player, 'height', 'N/A');
                        return height !== 'N/A' ? height : 'N/A';
                      })()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">Weight</span>
                    <span>
                      {(() => {
                        const weight = getPlayerProperty(player, 'weight_pounds', null);
                        if (weight !== null && weight !== 'N/A') {
                          return `${weight} lbs`;
                        }
                        // Check for other possible weight formats
                        const altWeight = getPlayerProperty(player, 'weight', 'N/A');
                        return altWeight !== 'N/A' ? altWeight : 'N/A';
                      })()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">College</span>
                    <span>{getPlayerProperty(player, 'college')}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">Conference</span>
                    <span>{getPlayerProperty(player, 'team.conference')}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-grey-500">Division</span>
                    <span>{getPlayerProperty(player, 'team.division')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-charcoal-700 rounded-xl shadow-lg p-6 mb-8 text-center">
            <p className="text-grey-600">Unable to load player information. Please try again later.</p>
          </div>
        )}
        
        {/* Season Averages */}
        {seasonAverages ? (
          <div className="bg-charcoal-700 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-grey-400 mb-4">
              Season Averages (2024-2025)
            </h2>
            
            <div className="overflow-x-auto">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 text-center">
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">PPG</span>
                  <span className="text-xl font-bold text-grey-400">{seasonAverages.pts.toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">RPG</span>
                  <span className="text-xl font-bold text-grey-400">{seasonAverages.reb.toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">APG</span>
                  <span className="text-xl font-bold text-grey-400">{seasonAverages.ast.toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">FG%</span>
                  <span className="text-xl font-bold text-grey-400">{(seasonAverages.fg_pct * 100).toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">3P%</span>
                  <span className="text-xl font-bold text-grey-400">{(seasonAverages.fg3_pct * 100).toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">FT%</span>
                  <span className="text-xl font-bold text-grey-400">{(seasonAverages.ft_pct * 100).toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">SPG</span>
                  <span className="text-xl font-bold text-grey-400">{seasonAverages.stl.toFixed(1)}</span>
                </div>
                
                <div className="bg-charcoal-600 p-3 rounded-lg">
                  <span className="block text-grey-600 text-sm">BPG</span>
                  <span className="text-xl font-bold text-grey-400">{seasonAverages.blk.toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-charcoal-600 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-grey-500 mb-4">Detailed Stats</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-grey-600">Games Played:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.games_played}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">Minutes:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.min}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">FGM-FGA:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.fgm.toFixed(1)}-{seasonAverages.fga.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">3PM-3PA:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.fg3m.toFixed(1)}-{seasonAverages.fg3a.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">FTM-FTA:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.ftm.toFixed(1)}-{seasonAverages.fta.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">OREB:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.oreb.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">DREB:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.dreb.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">TOV:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.turnover.toFixed(1)}</span>
                </div>
                
                <div>
                  <span className="text-grey-600">PF:</span>
                  <span className="ml-2 font-medium text-grey-400">{seasonAverages.pf.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          player && (
            <div className="bg-charcoal-700 rounded-xl shadow-lg p-6 mb-8 text-center">
              <h2 className="text-2xl font-semibold text-grey-400 mb-4">
                Season Averages
              </h2>
              <p className="text-grey-600">No season averages available for this player.</p>
            </div>
          )
        )}
        
        {/* Game Log Component */}
        {player && <GameLog games={games} player={player} />}
      </div>
    </div>
  );
} 
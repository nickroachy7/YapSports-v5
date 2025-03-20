"use client";

import { useState } from 'react';
import Link from 'next/link';

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

interface PlayerCardProps {
  player: {
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
  };
  recentGames?: Game[];
}

export default function PlayerCard({ player, recentGames = [] }: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  // Calculate if name is long
  const fullName = `${player.first_name} ${player.last_name}`;
  const isLongName = fullName.length > 20;

  // Format percentage to one decimal place
  const formatPct = (value: number) => (value * 100).toFixed(1);

  // Helper function to determine if a game should be considered played
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

  // Sort all games by date (chronological order - earliest games first)
  const sortedGames = recentGames ? [...recentGames].sort((a, b) => {
    // Sort games chronologically (earliest first)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }) : [];

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer"
      style={{
        width: '300px',
        height: '500px', // Increased height to accommodate mini game log
        perspective: '1000px'
      }}
    >
      <div 
        className="relative w-full h-full transition-transform duration-700 transform-style-preserve-3d"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Front of card */}
        <div 
          className="absolute w-full h-full bg-charcoal-700 rounded-xl overflow-hidden shadow-xl backface-hidden border-4 border-charcoal-500"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Player Photo Area */}
          <div className="h-[60%] bg-charcoal-600 flex items-center justify-center">
            <div className="text-grey-500">
              <svg 
                className="w-24 h-24"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>

          {/* Player Info */}
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white text-center mb-2 line-clamp-2 min-h-[4rem]">
              {player.first_name} {player.last_name}
            </h2>
            <div className="text-grey-400 text-lg mb-2">
              {player.position || 'N/A'}
            </div>
            <div className="text-grey-500 text-sm text-center">
              {player.team.full_name}
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div 
          className="absolute w-full h-full bg-charcoal-700 rounded-xl overflow-hidden shadow-xl backface-hidden border-4 border-charcoal-500"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="p-4">
            {/* Top section with photo and basic info */}
            <div className="flex items-start space-x-4 h-16">
              {/* Small player photo */}
              <div className="w-16 h-16 flex-shrink-0 bg-charcoal-600 rounded-lg flex items-center justify-center">
                <svg 
                  className="w-10 h-10 text-grey-500"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1} 
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>

              {/* Player details with fixed height */}
              <div className="flex-1 h-16 flex flex-col justify-start overflow-hidden">
                <h3 className={`font-bold text-white mb-1 truncate ${isLongName ? 'text-sm' : 'text-base'}`}>
                  {player.first_name} {player.last_name}
                </h3>
                <div className="text-grey-400 text-sm mb-1 whitespace-nowrap">
                  #{player.jersey_number || 'N/A'} • {player.position || 'N/A'}
                </div>
                <div className="text-grey-500 text-xs truncate">
                  {player.team.full_name}
                </div>
              </div>
            </div>

            {/* Season Averages */}
            {player.season_averages && (
              <div className="mt-2 grid grid-cols-4 gap-1 border-t border-charcoal-600 pt-2">
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">PPG</div>
                  <div className="text-xs text-white font-semibold">{player.season_averages.ppg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">RPG</div>
                  <div className="text-xs text-white font-semibold">{player.season_averages.rpg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">APG</div>
                  <div className="text-xs text-white font-semibold">{player.season_averages.apg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">FG%</div>
                  <div className="text-xs text-white font-semibold">{formatPct(player.season_averages.fg_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">3P%</div>
                  <div className="text-xs text-white font-semibold">{formatPct(player.season_averages.fg3_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">FT%</div>
                  <div className="text-xs text-white font-semibold">{formatPct(player.season_averages.ft_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">SPG</div>
                  <div className="text-xs text-white font-semibold">{player.season_averages.spg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-1.5 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-0.5">BPG</div>
                  <div className="text-xs text-white font-semibold">{player.season_averages.bpg.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Mini Game Log - Always show this section, even when empty */}
            <div className="mt-2 pt-2 border-t border-charcoal-600">
              {sortedGames.length > 0 ? (
                <div className="bg-charcoal-600 rounded-lg overflow-hidden">
                  <div className="game-log-container">
                    <div className="overflow-y-auto overflow-x-auto relative scrollbar-container" 
                      style={{ 
                        maxHeight: '230px',
                      }}>
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky-header">
                          <tr className="bg-charcoal-800 text-grey-500">
                            {/* Regular columns */}
                            <th className="p-1 pl-2 text-left min-w-[60px]">Date</th>
                            <th className="p-1 text-left min-w-[60px]">vs</th>
                            <th className="p-1 text-center min-w-[60px]">Result</th>
                            {/* Scrollable stat columns */}
                            <th className="p-1 text-center min-w-[45px]">PTS</th>
                            <th className="p-1 text-center min-w-[45px]">REB</th>
                            <th className="p-1 text-center min-w-[45px]">AST</th>
                            <th className="p-1 text-center min-w-[45px]">STL</th>
                            <th className="p-1 text-center min-w-[45px]">BLK</th>
                            <th className="p-1 text-center min-w-[45px]">FG</th>
                            <th className="p-1 text-center min-w-[45px]">3PT</th>
                            <th className="p-1 text-center min-w-[45px]">FT</th>
                            <th className="p-1 pr-2 text-center min-w-[45px]">MIN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGames.map((game) => {
                            const formattedDate = formatGameDate(game.date);
                            const effectivelyPlayed = isGameEffectivelyPlayed(game);
                            
                            const isHome = player?.team?.id === game.home_team.id;
                            const opponent = isHome ? game.visitor_team : game.home_team;
                            const playerTeamScore = isHome ? game.home_team_score : game.visitor_team_score;
                            const opponentScore = isHome ? game.visitor_team_score : game.home_team_score;
                            
                            // Determine result and styling
                            let result = '-';
                            let statusClass = '';
                            
                            if (effectivelyPlayed) {
                              if (playerTeamScore === 0 && opponentScore === 0) {
                                // Game is played but has 0-0 score (data not updated yet)
                                result = 'TBD';
                                statusClass = 'text-grey-500';
                              } else if (playerTeamScore > opponentScore) {
                                result = 'W';
                                statusClass = 'text-green-500';
                              } else if (playerTeamScore < opponentScore) {
                                result = 'L';
                                statusClass = 'text-red-500';
                              } else {
                                result = 'T';
                                statusClass = 'text-grey-500';
                              }
                            }
                            
                            return (
                              <tr key={game.id} className="border-b border-charcoal-700 hover:bg-charcoal-650">
                                {/* Regular columns (no longer sticky) */}
                                <td className="p-1 pl-2 text-grey-500">{formattedDate}</td>
                                <td className="p-1 text-grey-500">
                                  {isHome ? 'vs ' : '@ '}
                                  {opponent.abbreviation}
                                </td>
                                <td className="p-1 text-center">
                                  {effectivelyPlayed ? (
                                    <span className={`font-medium ${statusClass}`}>
                                      {result}
                                    </span>
                                  ) : (
                                    <span className="text-blue-500 font-medium">-</span>
                                  )}
                                </td>
                                {/* Scrollable stats - Improved null/undefined handling */}
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.pts !== undefined ? game.stats.pts : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.reb !== undefined ? game.stats.reb : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.ast !== undefined ? game.stats.ast : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.stl !== undefined ? game.stats.stl : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.blk !== undefined ? game.stats.blk : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? 
                                    ((game.stats.fgm !== undefined && game.stats.fga !== undefined) ? 
                                      `${game.stats.fgm}/${game.stats.fga}` : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? 
                                    ((game.stats.fg3m !== undefined && game.stats.fg3a !== undefined) ? 
                                      `${game.stats.fg3m}/${game.stats.fg3a}` : '-') : '-'}
                                </td>
                                <td className="p-1 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? 
                                    ((game.stats.ftm !== undefined && game.stats.fta !== undefined) ? 
                                      `${game.stats.ftm}/${game.stats.fta}` : '-') : '-'}
                                </td>
                                <td className="p-1 pr-2 text-center text-grey-500">
                                  {effectivelyPlayed && game.stats ? (game.stats.min !== undefined ? game.stats.min : '-') : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-charcoal-600 rounded-lg p-3 text-center">
                  <p className="text-grey-500 text-xs">No games available</p>
                </div>
              )}
            </div>

            <div className="border-t border-charcoal-600 mt-4 pt-2 pb-1 flex justify-center absolute bottom-2 left-0 right-0">
              <Link 
                href={`/players/${player?.team?.id || 0}`} 
                onClick={(e) => e.stopPropagation()} 
                className="bg-charcoal-800 hover:bg-charcoal-900 transition-colors text-white py-1 px-4 rounded-md text-xs font-medium"
              >
                View Player Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add global styles for the flip animation and subtle scrollbars */}
      <style jsx global>{`
        .backface-hidden {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .transform-style-preserve-3d {
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
        }
        
        /* Improved scrollbar styling for better usability */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
          background-color: transparent;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(30, 30, 30, 0.2);
          border-radius: 10px;
          margin: 2px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.5);
          border-radius: 10px;
          border: none;
          transition: background 0.2s ease;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 180, 180, 0.7);
        }
        
        /* For Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(150, 150, 150, 0.5) rgba(30, 30, 30, 0.2);
        }
        
        /* Game log container with clipping */
        .game-log-container {
          position: relative;
          overflow: hidden;
        }
        
        /* Sticky header styling */
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background-color: #2c2c2c; /* charcoal-800 equivalent */
        }
        
        .sticky-header th {
          background-color: #2c2c2c !important; /* charcoal-800 equivalent */
        }
        
        /* Fixed scrollbar container to ensure no overflow */
        .scrollbar-container {
          position: relative;
          overflow: auto;
          scrollbar-gutter: stable;
          border-radius: 0;
          padding: 0;
        }
        
        /* Ensure table fills container properly */
        .game-log-container table {
          border-collapse: collapse;
          width: 100%;
        }
        
        /* Remove all trace of scrollbar-corner as we don't need it with separate header */
        ::-webkit-scrollbar-corner {
          background-color: transparent !important;
          display: none !important;
        }
      `}</style>
    </div>
  );
} 
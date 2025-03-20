"use client";

import { useState } from 'react';

interface PlayerCardProps {
  player: {
    first_name: string;
    last_name: string;
    position: string;
    team: {
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
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  // Calculate if name is long
  const fullName = `${player.first_name} ${player.last_name}`;
  const isLongName = fullName.length > 20;

  // Format percentage to one decimal place
  const formatPct = (value: number) => (value * 100).toFixed(1);

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer"
      style={{
        width: '300px',
        height: '420px',
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
          className="absolute w-full h-full bg-charcoal-700 rounded-xl overflow-hidden shadow-xl backface-hidden"
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
          className="absolute w-full h-full bg-charcoal-700 rounded-xl overflow-hidden shadow-xl backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="p-6">
            {/* Top section with photo and basic info */}
            <div className="flex items-start space-x-4 h-20">
              {/* Small player photo */}
              <div className="w-20 h-20 flex-shrink-0 bg-charcoal-600 rounded-lg flex items-center justify-center">
                <svg 
                  className="w-12 h-12 text-grey-500"
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
              <div className="flex-1 h-20 flex flex-col justify-start overflow-hidden">
                <h3 className={`font-bold text-white mb-1 truncate ${isLongName ? 'text-lg' : 'text-xl'}`}>
                  {player.first_name} {player.last_name}
                </h3>
                <div className="text-grey-400 mb-1 whitespace-nowrap">
                  #{player.jersey_number || 'N/A'} • {player.position || 'N/A'}
                </div>
                <div className="text-grey-500 text-sm truncate">
                  {player.team.full_name}
                </div>
              </div>
            </div>

            {/* Season Averages */}
            {player.season_averages && (
              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-charcoal-600 pt-4">
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">PPG</div>
                  <div className="text-sm text-white font-semibold">{player.season_averages.ppg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">RPG</div>
                  <div className="text-sm text-white font-semibold">{player.season_averages.rpg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">APG</div>
                  <div className="text-sm text-white font-semibold">{player.season_averages.apg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">FG%</div>
                  <div className="text-sm text-white font-semibold">{formatPct(player.season_averages.fg_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">3P%</div>
                  <div className="text-sm text-white font-semibold">{formatPct(player.season_averages.fg3_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">FT%</div>
                  <div className="text-sm text-white font-semibold">{formatPct(player.season_averages.ft_pct)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">SPG</div>
                  <div className="text-sm text-white font-semibold">{player.season_averages.spg.toFixed(1)}</div>
                </div>
                <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                  <div className="text-xs text-grey-500 mb-1">BPG</div>
                  <div className="text-sm text-white font-semibold">{player.season_averages.bpg.toFixed(1)}</div>
                </div>
              </div>
            )}

            <div className="border-t border-charcoal-600 pt-4 mt-4">
              <div className="text-grey-400 text-sm mb-2">
                Click card to flip back
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add global styles for the flip animation */}
      <style jsx global>{`
        .backface-hidden {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .transform-style-preserve-3d {
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
} 
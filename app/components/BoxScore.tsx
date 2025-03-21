'use client';

import React, { useState } from 'react';
import { Team } from '../types/game';

interface PlayerStat {
  player: {
    id: number;
    first_name: string;
    last_name: string;
    position: string;
  };
  team: Team;
  min: string;
  pts: number;
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
}

interface TeamTotals {
  min: number;
  pts: number;
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
}

interface TeamData {
  info: Team;
  players: PlayerStat[];
  totals: TeamTotals;
}

interface BoxScoreProps {
  homeTeam: TeamData;
  visitorTeam: TeamData;
  isLive?: boolean;
  period?: number;
  timeRemaining?: string;
  status?: string;
}

const BoxScore: React.FC<BoxScoreProps> = ({
  homeTeam,
  visitorTeam,
  isLive = false,
  period = 0,
  timeRemaining = '',
  status = ''
}) => {
  const [activeTeam, setActiveTeam] = useState<'home' | 'visitor'>('home');
  const activeTeamData = activeTeam === 'home' ? homeTeam : visitorTeam;
  
  // Format minutes played (convert "12:30" to "12m 30s" or similar)
  const formatMinutes = (min: string): string => {
    if (!min) return '0m';
    
    const parts = min.split(':');
    if (parts.length === 2) {
      return `${parts[0]}m`;
    }
    return min;
  };
  
  // Format percentages
  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };
  
  // Format period
  const formatPeriod = (period: number): string => {
    if (period <= 4) return `Q${period}`;
    return period === 5 ? 'OT' : `${period-4}OT`; // OT, 2OT, 3OT etc.
  };

  return (
    <div className="bg-charcoal-800 rounded-lg overflow-hidden">
      {/* Game status header for live games */}
      {isLive && (
        <div className="bg-charcoal-700 p-3 flex items-center justify-center space-x-2">
          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-red-500 font-medium">
            {formatPeriod(period)} {timeRemaining && `• ${timeRemaining}`}
          </span>
        </div>
      )}
      
      {/* Team tabs */}
      <div className="flex border-b border-charcoal-600">
        <button 
          className={`flex-1 p-3 font-medium text-center ${activeTeam === 'home' ? 'bg-charcoal-700 text-white' : 'text-grey-500 hover:bg-charcoal-700 hover:text-grey-300'}`}
          onClick={() => setActiveTeam('home')}
        >
          {homeTeam.info.full_name}
        </button>
        <button 
          className={`flex-1 p-3 font-medium text-center ${activeTeam === 'visitor' ? 'bg-charcoal-700 text-white' : 'text-grey-500 hover:bg-charcoal-700 hover:text-grey-300'}`}
          onClick={() => setActiveTeam('visitor')}
        >
          {visitorTeam.info.full_name}
        </button>
      </div>
      
      {/* Box score table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-charcoal-600">
          <thead>
            <tr className="bg-charcoal-700">
              <th className="px-4 py-2 text-left text-xs font-medium text-grey-500 uppercase tracking-wider sticky left-0 bg-charcoal-700">Player</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">MIN</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">PTS</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">FG</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">3PT</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">FT</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">OREB</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">DREB</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">REB</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">AST</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">STL</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">BLK</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">TO</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-grey-500 uppercase tracking-wider">PF</th>
            </tr>
          </thead>
          <tbody className="bg-charcoal-800 divide-y divide-charcoal-700">
            {activeTeamData.players
              .sort((a, b) => (b.pts || 0) - (a.pts || 0)) // Sort by points
              .map((player) => (
                <tr key={player.player.id} className="hover:bg-charcoal-700">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-white sticky left-0 bg-charcoal-800">
                    <div className="flex flex-col">
                      <span className="font-medium">{player.player.last_name}, {player.player.first_name.charAt(0)}</span>
                      <span className="text-xs text-grey-400">{player.player.position}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{formatMinutes(player.min)}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.pts}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.fgm}-{player.fga}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.fg3m}-{player.fg3a}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.ftm}-{player.fta}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.oreb}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.dreb}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.reb}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.ast}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.stl}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.blk}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.turnover}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-grey-300">{player.pf}</td>
                </tr>
              ))}
            
            {/* Team totals row */}
            <tr className="bg-charcoal-700">
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-charcoal-700">TEAM TOTALS</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.min}m</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.pts}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">
                {activeTeamData.totals.fgm}-{activeTeamData.totals.fga} ({formatPercentage(activeTeamData.totals.fg_pct)})
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">
                {activeTeamData.totals.fg3m}-{activeTeamData.totals.fg3a} ({formatPercentage(activeTeamData.totals.fg3_pct)})
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">
                {activeTeamData.totals.ftm}-{activeTeamData.totals.fta} ({formatPercentage(activeTeamData.totals.ft_pct)})
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.oreb}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.dreb}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.reb}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.ast}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.stl}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.blk}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.turnover}</td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-center text-white">{activeTeamData.totals.pf}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BoxScore; 
"use client";

import React from 'react';
import Link from 'next/link';
import { Team } from '../../types';

interface GameHeaderProps {
  currentTeam: Team | null;
  coins: number;
  teamTokens: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  currentTeam,
  coins,
  teamTokens,
  onRefresh,
  isRefreshing
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/teams"
          className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 rounded-lg transition-colors text-white"
        >
          <span>←</span>
          <span>Back to Teams</span>
        </Link>
        
        {currentTeam && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {currentTeam.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{currentTeam.name}</h1>
              <p className="text-slate-400 text-sm">Team Management</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 rounded-lg">
          <span className="text-yellow-400">💰</span>
          <span className="text-white font-bold">{teamTokens.toLocaleString()}</span>
          <span className="text-slate-400 text-sm">team tokens</span>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors text-white"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );
};

export default GameHeader; 
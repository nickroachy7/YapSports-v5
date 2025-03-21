'use client';

import React, { useEffect, useState } from 'react';
import BoxScore from '../../../components/BoxScore';
import Link from 'next/link';
import Header from '../../../components/Header';

interface GameData {
  game: any;
  homeTeam: any;
  visitorTeam: any;
}

export default function LiveBoxScorePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const fetchGameStats = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const res = await fetch(`/api/games/${gameId}/stats?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch game stats');
      }
      
      const data = await res.json();
      setData(data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching game stats:', err);
      setError('Failed to load game data. Please try again.');
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchGameStats();
  }, [gameId]);
  
  // Set up polling for live updates every 30 seconds
  useEffect(() => {
    if (!data) return;
    
    // Only set up polling if the game is live
    const isGameLive = data.game.period > 0 && data.game.status !== "Final";
    
    if (isGameLive) {
      const interval = setInterval(() => {
        console.log("Fetching fresh game data...");
        fetchGameStats();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [data, gameId]);
  
  if (loading) {
    return (
      <main className="min-h-screen bg-charcoal-800 flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
        <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
          <div className="container mx-auto px-4 text-center text-grey-800">
            <p>© 2024 YapSports. All rights reserved.</p>
          </div>
        </footer>
      </main>
    );
  }
  
  if (error || !data) {
    return (
      <main className="min-h-screen bg-charcoal-800 flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            {error || 'An unexpected error occurred.'}
          </div>
          <Link href="/" className="text-blue-500 hover:text-blue-600 mt-4 inline-block">
            &larr; Back to Games
          </Link>
        </div>
        <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
          <div className="container mx-auto px-4 text-center text-grey-800">
            <p>© 2024 YapSports. All rights reserved.</p>
          </div>
        </footer>
      </main>
    );
  }
  
  const { game, homeTeam, visitorTeam } = data;
  
  // Format date nicely
  const gameDate = new Date(game.date);
  const formattedDate = gameDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Check if game is still live
  const isGameLive = game.period > 0 && game.status !== "Final";
  
  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Game header */}
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:text-blue-600 mb-2 inline-block">
            &larr; Back to Games
          </Link>
          
          <h1 className="text-2xl font-bold mb-1">
            {visitorTeam.info.full_name} vs {homeTeam.info.full_name}
          </h1>
          
          <div className="flex items-center mb-4">
            <div className="text-lg font-medium">
              <span className="text-grey-500">{formattedDate}</span>
            </div>
            <div className="mx-4 text-grey-500">•</div>
            <div className="text-lg">
              <span className="font-bold">{visitorTeam.info.abbreviation}</span>
              <span className="mx-2 font-medium">{game.visitor_team_score}</span>
              <span className="text-grey-500 mx-1">-</span>
              <span className="font-medium">{game.home_team_score}</span>
              <span className="font-bold ml-2">{homeTeam.info.abbreviation}</span>
            </div>
            {isGameLive ? (
              <div className="ml-4 flex items-center">
                <span className="h-2 w-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                <span className="text-red-500 font-medium">LIVE</span>
              </div>
            ) : (
              <div className="ml-4 text-green-500 font-medium">Final</div>
            )}
          </div>
          
          {/* Auto-refresh notice and last updated time */}
          <div className="text-sm text-grey-400 mb-4 flex justify-between">
            {isGameLive && <div>Stats update automatically every 30 seconds</div>}
            <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
          </div>
        </div>
        
        {/* Box Score Component */}
        <BoxScore 
          homeTeam={homeTeam}
          visitorTeam={visitorTeam}
          isLive={isGameLive}
          period={game.period}
          timeRemaining={game.time}
          status={game.status}
        />
        
        {/* Live game stats */}
        <div className="mt-8 bg-charcoal-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Game Stats</h2>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">{homeTeam.info.full_name}</h3>
              <div className="text-4xl font-bold mb-4">{game.home_team_score}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>FG%: {(homeTeam.totals.fg_pct * 100).toFixed(1)}%</div>
                <div>3P%: {(homeTeam.totals.fg3_pct * 100).toFixed(1)}%</div>
                <div>Rebounds: {homeTeam.totals.reb}</div>
                <div>Assists: {homeTeam.totals.ast}</div>
                <div>Steals: {homeTeam.totals.stl}</div>
                <div>Blocks: {homeTeam.totals.blk}</div>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">{visitorTeam.info.full_name}</h3>
              <div className="text-4xl font-bold mb-4">{game.visitor_team_score}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>FG%: {(visitorTeam.totals.fg_pct * 100).toFixed(1)}%</div>
                <div>3P%: {(visitorTeam.totals.fg3_pct * 100).toFixed(1)}%</div>
                <div>Rebounds: {visitorTeam.totals.reb}</div>
                <div>Assists: {visitorTeam.totals.ast}</div>
                <div>Steals: {visitorTeam.totals.stl}</div>
                <div>Blocks: {visitorTeam.totals.blk}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Manual refresh button */}
        <div className="mt-4 flex justify-center">
          <button 
            onClick={fetchGameStats}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Refresh Stats
          </button>
        </div>
      </div>
      
      <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
        <div className="container mx-auto px-4 text-center text-grey-800">
          <p>© 2024 YapSports. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
} 
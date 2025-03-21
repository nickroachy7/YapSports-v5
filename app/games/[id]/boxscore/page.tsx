import React from 'react';
import BoxScore from '../../../components/BoxScore';
import Link from 'next/link';
import Header from '../../../components/Header';

async function getGameStats(gameId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  // Add timestamp for cache busting
  const timestamp = Date.now();
  const res = await fetch(`${baseUrl}/api/games/${gameId}/stats?t=${timestamp}`, {
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
  
  return res.json();
}

export default async function BoxScorePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const data = await getGameStats(gameId);
  
  // Extract data
  const { game, homeTeam, visitorTeam } = data;
  
  // Format date nicely
  const gameDate = new Date(game.date);
  const formattedDate = gameDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
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
            <div className="ml-4 text-green-500 font-medium">Final</div>
          </div>
        </div>
        
        {/* Box Score Component */}
        <BoxScore 
          homeTeam={homeTeam}
          visitorTeam={visitorTeam}
          isLive={false}
          status={game.status}
        />
        
        {/* Game summary (could be expanded with quarters scoring, etc.) */}
        <div className="mt-8 bg-charcoal-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Game Summary</h2>
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
      </div>
      
      <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
        <div className="container mx-auto px-4 text-center text-grey-800">
          <p>© 2024 YapSports. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
} 
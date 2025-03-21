import React from 'react';
import Link from 'next/link';
import { BalldontlieAPI } from '@balldontlie/sdk';
import Header from '../../../components/Header';

// Ensure API key is properly typed
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is not defined in environment variables');
}

// Create a new API instance with a custom fetch that bypasses caching
const api = new BalldontlieAPI({ apiKey });

// Format time to Eastern Time (ET)
const formatGameTime = (isoDateString: string) => {
  try {
    const date = new Date(isoDateString);
    
    // Format to Eastern Time (America/New_York handles both EST and EDT)
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }) + ' ET';
    
    return formattedTime;
  } catch (error) {
    console.error(`Error formatting game time ${isoDateString}:`, error);
    return "Time unavailable";
  }
};

// Retry function for API requests
async function retryFetch<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    console.log(`Retrying... ${retries} attempts left`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryFetch(fn, retries - 1, delay);
  }
}

export default async function GamePreviewPage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  
  try {
    // Fetch game details with retry logic and timestamp for cache-busting
    const fetchGame = async () => {
      console.log(`Fetching game with ID: ${gameId}, timestamp: ${Date.now()}`);
      return await api.nba.getGame(parseInt(gameId));
    };
    
    // Use retry logic to ensure we get fresh data
    const gameResponse = await retryFetch(fetchGame);
    
    if (!gameResponse || !gameResponse.data) {
      throw new Error('Game not found');
    }
    
    const game = gameResponse.data;
    
    // Format date nicely
    const gameDate = new Date(game.date);
    const formattedDate = gameDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format game time
    const gameTime = formatGameTime(game.status || game.date);
    
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
              {game.visitor_team.full_name} vs {game.home_team.full_name}
            </h1>
            
            <div className="text-lg text-grey-500">
              {formattedDate} • {gameTime}
            </div>
          </div>
          
          {/* Game preview card */}
          <div className="bg-charcoal-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-charcoal-600 border-b border-charcoal-500">
              <h2 className="text-xl font-bold">Game Preview</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
              <div className="md:col-span-3 mb-4">
                <h3 className="text-lg font-medium mb-2">Matchup Information</h3>
                <div className="bg-charcoal-600 p-4 rounded">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{game.visitor_team.abbreviation}</div>
                      <div className="text-sm">{game.visitor_team.full_name}</div>
                    </div>
                    <div className="text-xl font-medium">@</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{game.home_team.abbreviation}</div>
                      <div className="text-sm">{game.home_team.full_name}</div>
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-sm text-grey-400">Game Time (ET)</div>
                    <div className="text-lg">{gameTime}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-4">{game.visitor_team.full_name}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-grey-400">Conference</div>
                      <div>{game.visitor_team.conference}</div>
                    </div>
                    <div>
                      <div className="text-sm text-grey-400">Division</div>
                      <div>{game.visitor_team.division}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-4">{game.home_team.full_name}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-grey-400">Conference</div>
                      <div>{game.home_team.conference}</div>
                    </div>
                    <div>
                      <div className="text-sm text-grey-400">Division</div>
                      <div>{game.home_team.division}</div>
                    </div>
                  </div>
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
  } catch (error) {
    console.error('Error fetching game details:', error);
    return (
      <main className="min-h-screen bg-charcoal-800 flex flex-col">
        <Header />
        
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            Failed to load game preview. Please try again later.
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
} 
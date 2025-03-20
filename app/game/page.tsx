"use client";

import { useState } from 'react';
import Header from '../components/Header';
import PlayerCard from '../components/PlayerCard';

export default function GamePage() {
  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/players/random');
      if (!response.ok) {
        throw new Error('Failed to fetch player data');
      }
      
      const data = await response.json();
      setPlayer(data);
    } catch (err) {
      setError('Error fetching player card. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
        {player ? (
          <div className="mb-8">
            <PlayerCard 
              player={player} 
              recentGames={player.recentGames || []}
            />
          </div>
        ) : null}
        
        <button 
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors shadow-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={handleGetCard}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Get Card'}
        </button>
        
        {error && (
          <div className="mt-4 text-red-500">{error}</div>
        )}
      </div>
    </main>
  );
} 
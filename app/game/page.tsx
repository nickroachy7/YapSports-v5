"use client";

import { useState } from 'react';
import Header from '../components/Header';
import PlayerCard from '../components/PlayerCard';

export default function GamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getRandomPlayer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch a random player
      const response = await fetch('/api/players/random');
      if (!response.ok) {
        throw new Error('Failed to fetch random player');
      }
      
      const data = await response.json();
      setPlayer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get player card');
      console.error('Error fetching random player:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
        {error && (
          <div className="mb-8 text-red-500 text-center">
            {error}
          </div>
        )}
        
        {player ? (
          <div className="mb-8">
            <PlayerCard player={player} />
          </div>
        ) : null}
        
        <button 
          onClick={getRandomPlayer}
          disabled={isLoading}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors shadow-lg ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Loading...' : 'Get Card'}
        </button>
      </div>
    </main>
  );
} 
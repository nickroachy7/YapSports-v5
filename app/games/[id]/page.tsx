import { redirect } from 'next/navigation';
import { BalldontlieAPI } from '@balldontlie/sdk';

// Ensure API key is properly typed
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is not defined in environment variables');
}

const api = new BalldontlieAPI({ apiKey });

// Function to check if game is live
const isGameLive = (game: any): boolean => {
  // If period > 0 and there's no final result yet, the game is live
  return game.period > 0 && game.status !== "Final";
};

// Function to check if game is finished
const isGameFinished = (game: any): boolean => {
  return game.status === "Final" || 
         (typeof game.status === 'string' && game.status.toLowerCase().includes('final'));
};

export default async function GamePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  
  try {
    // Fetch basic game info to determine status
    const gameResponse = await api.nba.getGame(parseInt(gameId));
    
    if (!gameResponse || !gameResponse.data) {
      throw new Error('Game not found');
    }
    
    const game = gameResponse.data;
    
    // Redirect based on game status
    if (isGameLive(game)) {
      // Game is currently live, redirect to live box score
      redirect(`/games/${gameId}/live`);
    } else if (isGameFinished(game)) {
      // Game has finished, redirect to final box score
      redirect(`/games/${gameId}/boxscore`);
    } else {
      // Game is upcoming, redirect to the preview
      redirect(`/games/${gameId}/preview`);
    }
  } catch (error) {
    console.error('Error fetching game details:', error);
    throw new Error('Failed to load game details');
  }
} 
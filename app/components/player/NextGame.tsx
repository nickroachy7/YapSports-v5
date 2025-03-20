import { useEffect, useState } from 'react';
import { Player } from '../../types/player';

interface NextGameProps {
  player: Player;
}

interface GameDetails {
  id: number;
  date: string;
  formatted_time: string;
  status: 'upcoming' | 'live' | 'final';
  home_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  visitor_team_score: number;
  player_stats?: {
    min: string;
    pts: number;
    ast: number;
    reb: number;
    stl: number;
    blk: number;
    fg_pct: number;
    fg3_pct: number;
    ft_pct: number;
  };
}

export default function NextGame({ player }: NextGameProps) {
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameDetails = async () => {
    try {
      // Fetch next game details including live/final stats if available
      const response = await fetch(`/api/players/${player.id}/next-game`);
      if (!response.ok) {
        throw new Error('Failed to fetch game details');
      }
      const data = await response.json();
      setGameDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGameDetails();
    
    // Set up polling for live games
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (gameDetails?.status === 'live') {
      pollInterval = setInterval(fetchGameDetails, 30000); // Poll every 30 seconds
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [player.id, gameDetails?.status]);

  if (isLoading) {
    return (
      <div className="bg-charcoal-700 rounded-xl shadow-lg p-4 mb-8">
        <div className="animate-pulse flex justify-between items-center">
          <div className="h-4 bg-charcoal-600 rounded w-24"></div>
          <div className="h-4 bg-charcoal-600 rounded w-32"></div>
          <div className="h-4 bg-charcoal-600 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error || !gameDetails) {
    return (
      <div className="bg-charcoal-700 rounded-xl shadow-lg p-4 mb-8">
        <p className="text-grey-600 text-center">No upcoming games found</p>
      </div>
    );
  }

  return (
    <div className="bg-charcoal-700 rounded-xl shadow-lg p-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-white">Next Game</span>
          <span className="text-grey-400 ml-4">
            {new Date(gameDetails.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC'
            })}
            <span className="ml-2 text-grey-400">{gameDetails.formatted_time}</span>
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-bold text-grey-400">{gameDetails.visitor_team.abbreviation}</span>
          <span className="mx-2 text-grey-500">@</span>
          <span className="font-bold text-grey-400">{gameDetails.home_team.abbreviation}</span>
        </div>
      </div>

      {/* Game Status and Stats */}
      {gameDetails.status !== 'upcoming' && (
        <>
          {/* Score */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-grey-400">
                {gameDetails.visitor_team_score}
              </span>
              <span className="text-xl text-grey-600">-</span>
              <span className="text-2xl font-bold text-grey-400">
                {gameDetails.home_team_score}
              </span>
            </div>
          </div>

          {/* Player Stats */}
          {gameDetails.player_stats && (
            <div className="grid grid-cols-5 gap-4 mt-4">
              <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                <span className="block text-grey-600 text-xs">PTS</span>
                <span className="text-lg font-bold text-grey-400">{gameDetails.player_stats.pts}</span>
              </div>
              <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                <span className="block text-grey-600 text-xs">REB</span>
                <span className="text-lg font-bold text-grey-400">{gameDetails.player_stats.reb}</span>
              </div>
              <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                <span className="block text-grey-600 text-xs">AST</span>
                <span className="text-lg font-bold text-grey-400">{gameDetails.player_stats.ast}</span>
              </div>
              <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                <span className="block text-grey-600 text-xs">BLK</span>
                <span className="text-lg font-bold text-grey-400">{gameDetails.player_stats.blk}</span>
              </div>
              <div className="bg-charcoal-600 p-2 rounded-lg text-center">
                <span className="block text-grey-600 text-xs">STL</span>
                <span className="text-lg font-bold text-grey-400">{gameDetails.player_stats.stl}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
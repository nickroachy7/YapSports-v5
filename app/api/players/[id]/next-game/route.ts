import { NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

// Ensure API key is available
if (!process.env.API_KEY) {
  throw new Error('API_KEY is not defined in environment variables');
}

const api = new BalldontlieAPI({ apiKey: process.env.API_KEY });

// Helper function to get date string in YYYY-MM-DD format using UTC
function getDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Helper function to get next N dates in UTC
function getNextDates(startDate: Date, numberOfDays: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    dates.push(getDateString(date));
  }
  return dates;
}

// Helper function to format game time to Eastern Time
function formatGameTime(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${isoDateString}`);
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }) + ' ET';
  } catch (error) {
    console.error(`Error formatting game time ${isoDateString}:`, error);
    return "Time unavailable";
  }
}

// Helper function to get staggered game time if actual time is midnight UTC
function getStaggeredGameTime(index: number): string {
  const startTimes = [
    '7:00 PM ET', '7:30 PM ET', '8:00 PM ET', '8:30 PM ET',
    '9:00 PM ET', '9:30 PM ET', '10:00 PM ET', '10:30 PM ET'
  ];
  return startTimes[index % startTimes.length];
}

interface NBAPlayer {
  id: number;
  team: {
    id: number;
  };
}

interface BoxScore {
  game: {
    id: number;
  };
  player: {
    id: number;
    first_name: string;
    last_name: string;
  };
  team: {
    id: number;
    abbreviation: string;
  };
  stats: {
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to midnight UTC for consistent date comparison
    
    // Get player's team ID first
    const playerResponse = await api.nba.getPlayer(playerId);
    if (!playerResponse.data) {
      throw new Error('Player not found');
    }
    const player = playerResponse.data as NBAPlayer;
    const teamId = player.team.id;
    
    // Get games for the next 7 days
    const nextDates = getNextDates(today, 7);
    let nextGame = null;
    let gameIndex = 0;

    // First, check games for the next 7 days
    for (const date of nextDates) {
      const gamesResponse = await api.nba.getGames({
        team_ids: [teamId],
        dates: [date]
      });

      if (gamesResponse.data && gamesResponse.data.length > 0) {
        // Find the first game that hasn't been played yet
        const upcomingGame = gamesResponse.data.find(game => {
          const gameDate = new Date(game.date);
          gameDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC for comparison
          return gameDate >= today;
        });

        if (upcomingGame) {
          nextGame = upcomingGame;
          break;
        }
        gameIndex++;
      }
    }

    // If no games found in next 7 days, look further ahead
    if (!nextGame) {
      const futureGamesResponse = await api.nba.getGames({
        team_ids: [teamId],
        seasons: [today.getFullYear()],
        per_page: 100
      });

      if (futureGamesResponse.data && futureGamesResponse.data.length > 0) {
        // Find the first game that hasn't been played yet
        nextGame = futureGamesResponse.data.find(game => {
          const gameDate = new Date(game.date);
          gameDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC for comparison
          return gameDate >= today;
        });
      }
    }

    if (!nextGame) {
      return NextResponse.json(null);
    }

    // Process game time
    const gameTimeStr = nextGame.status || (nextGame as any).datetime;
    const gameDate = new Date(gameTimeStr);
    const isDefaultTime = 
      gameDate.getUTCHours() === 0 && 
      gameDate.getUTCMinutes() === 0 && 
      gameDate.getUTCSeconds() === 0;

    // Format the game time
    const formattedTime = isDefaultTime 
      ? getStaggeredGameTime(gameIndex)
      : formatGameTime(gameTimeStr);

    // Check if the game is live or upcoming
    const gameStarted = gameDate <= today;
    const timeDiff = Math.abs(gameDate.getTime() - today.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Consider a game "live" if it started within the last 3 hours
    const isLive = gameStarted && hoursDiff <= 3;
    
    // Consider a game "final" if it started more than 3 hours ago
    const isFinal = gameStarted && hoursDiff > 3;

    // If game is live or final, get box scores
    if (isLive || isFinal) {
      try {
        const boxScoresResponse = await api.nba.getBoxScores(nextGame.id.toString());
        
        if (boxScoresResponse.data) {
          // Find player's stats in box scores
          const boxScore = Array.isArray(boxScoresResponse.data) 
            ? (boxScoresResponse.data as unknown as BoxScore[]).find(stats => stats.player?.id === playerId)
            : null;

          if (boxScore?.stats) {
            return NextResponse.json({
              ...nextGame,
              status: isLive ? 'live' : 'final',
              player_stats: boxScore.stats,
              formatted_time: formattedTime
            });
          }
        }

        // If we couldn't get player stats, still return the game
        return NextResponse.json({
          ...nextGame,
          status: isLive ? 'live' : 'final',
          player_stats: null,
          formatted_time: formattedTime
        });
      } catch (error) {
        console.error('Error fetching box scores:', error);
        // On error, return the game without stats
        return NextResponse.json({
          ...nextGame,
          status: isLive ? 'live' : 'final',
          player_stats: null,
          formatted_time: formattedTime
        });
      }
    }

    // Return upcoming game details
    return NextResponse.json({
      ...nextGame,
      status: 'upcoming',
      formatted_time: formattedTime
    });
  } catch (error) {
    console.error('Error fetching next game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details' },
      { status: 500 }
    );
  }
} 
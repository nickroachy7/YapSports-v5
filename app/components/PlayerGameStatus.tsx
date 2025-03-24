"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import * as gameDataService from '../services/gameDataService';
import { Game } from '../types/game';

interface Player {
  first_name: string;
  last_name: string;
  position: string;
  team: {
    id: number;
    full_name: string;
  };
  jersey_number?: string;
  season_averages?: {
    ppg: number;
    rpg: number;
    apg: number;
    fg_pct: number;
    fg3_pct: number;
    ft_pct: number;
    spg: number;
    bpg: number;
  };
}

interface PlayerGameStatusProps {
  player: Player;
  recentGames: Game[];
}

// Helper function to format dates consistently for comparison
const formatDateForComparison = (dateString: string): Date => {
  const date = new Date(dateString);
  // Reset time to beginning of day for consistent comparison
  date.setHours(0, 0, 0, 0);
  return date;
};

// Helper function to get today's date with time reset
const getTodayDate = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Get a staggered game time (for games with default UTC midnight times)
const getStaggeredGameTime = (index: number): string => {
  // Create staggered times starting from 7:00 PM ET
  const baseHour = 7;
  const hour = baseHour + Math.floor(index / 2);
  const minute = (index % 2) * 30;
  
  return `${hour}:${minute === 0 ? '00' : minute} PM ET`;
};

// Format game time to Eastern Time (ET)
const formatGameTime = (isoDateString: string): string => {
  try {
    // Create a date directly from the ISO string (which is in UTC)
    const date = new Date(isoDateString);
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${isoDateString}`);
    }
    
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

// Process upcoming game to get the correct game time
const processGameTime = (game: Game): string => {
  try {
    // For games, the status field can contain the game time
    const gameTimeStr = game.status || game.date;
    
    if (!gameTimeStr) {
      throw new Error(`No game time available for game ${game.id}`);
    }
    
    // If we have a status field that looks like a time string (e.g., "7:30 PM ET"), use that
    if (typeof gameTimeStr === 'string' && /\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*ET)?/i.test(gameTimeStr)) {
      return gameTimeStr.includes('ET') ? gameTimeStr : `${gameTimeStr} ET`;
    }
    
    // Check if game time is a valid date
    const gameTime = new Date(gameTimeStr);
    if (isNaN(gameTime.getTime())) {
      throw new Error(`Invalid game time: ${gameTimeStr}`);
    }
    
    // Check if it's midnight UTC (a common default value)
    const isDefaultTime = 
      gameTime.getUTCHours() === 0 && 
      gameTime.getUTCMinutes() === 0 && 
      gameTime.getUTCSeconds() === 0;
    
    if (isDefaultTime) {
      // If time is the default midnight UTC, assign staggered time based on game ID
      return getStaggeredGameTime(game.id % 8);
    } else {
      // Otherwise, use the actual time from the date
      return formatGameTime(gameTimeStr);
    }
  } catch (e) {
    console.error(`Error processing game time for game ${game.id}:`, e);
    return getStaggeredGameTime(game.id % 8); // Fallback on error
  }
};

// Helper function to calculate game end time more accurately
const calculateGameEndTime = (game: Game): Date => {
  const gameDate = new Date(game.date);
  
  // Calculate a more accurate end time based on game data
  // NBA games typically last 2.5 hours, but can go longer with overtimes
  let gameLength = 2.5; // Default game length in hours
  
  // If we have period information, adjust for overtimes
  if (game.period && game.period > 4) {
    // Add 15 minutes for each overtime period
    gameLength += ((game.period - 4) * 0.25);
  }
  
  // Create a new date object to avoid mutating the original
  const endTime = new Date(gameDate);
  endTime.setHours(endTime.getHours() + gameLength);
  
  return endTime;
};

// Memoize the component to prevent unnecessary re-renders
function PlayerGameStatusComponent({ player, recentGames = [] }: PlayerGameStatusProps) {
  const [relevantGame, setRelevantGame] = useState<Game | null>(null);
  const [gameStatus, setGameStatus] = useState<'live' | 'recent' | 'upcoming' | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());
  const [liveGamesData, setLiveGamesData] = useState<Game[]>([]);
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlayerKey, setCurrentPlayerKey] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  // Track when the last recent game will expire to show a countdown
  const [recentGameExpiry, setRecentGameExpiry] = useState<number | null>(null);
  // Double-buffering to prevent UI flicker - keep stable reference for rendering
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'live' | 'recent' | 'upcoming' | null>(null);
  // Store initial game data for immediate render
  const [initialGameSet, setInitialGameSet] = useState<boolean>(false);

  // Immediate initialization from props
  useEffect(() => {
    // Run this only once when props are first received
    if (!initialGameSet && player?.team?.id && recentGames.length > 0) {
      // Find the most relevant game from the recentGames prop for immediate display
      const teamId = player.team.id;
      let quickGame: Game | null = null;
      let quickStatus: 'live' | 'recent' | 'upcoming' | null = null;
      
      // Look for a potential live game first
      const potentialLiveGame = recentGames.find(game => 
        (game.home_team.id === teamId || game.visitor_team.id === teamId) && 
        isGameLive(game)
      );
      
      if (potentialLiveGame) {
        quickGame = potentialLiveGame;
        quickStatus = 'live';
      } else {
        // Look for recent games
        const today = getTodayDate();
        const now = new Date();
        const recentGamesFiltered = recentGames
          .filter(game => 
            (game.home_team.id === teamId || game.visitor_team.id === teamId) && 
            isGameFinished(game)
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (recentGamesFiltered.length > 0) {
          const mostRecent = recentGamesFiltered[0];
          const gameEndTime = calculateGameEndTime(mostRecent);
          const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
          
          if (gameEndTime > threeHoursAgo) {
            quickGame = mostRecent;
            quickStatus = 'recent';
          }
        }
        
        // If no recent game, look for upcoming
        if (!quickGame) {
          const upcomingGames = recentGames
            .filter(game => 
              (game.home_team.id === teamId || game.visitor_team.id === teamId) && 
              isGameUpcoming(game)
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          if (upcomingGames.length > 0) {
            quickGame = upcomingGames[0];
            quickStatus = 'upcoming';
          }
        }
      }
      
      // Set initial state immediately for faster render
      if (quickGame) {
        // Ensure stats are initialized
        if (!quickGame.stats) {
          quickGame.stats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
        }
        setRelevantGame(quickGame);
        setGameStatus(quickStatus);
        setInitialGameSet(true);
      }
    }
  }, [player, recentGames, initialGameSet]);

  // Function to determine if a game is finished (must be defined before isGameLive)
  const isGameFinished = (game: Game): boolean => {
    // First check explicit game status
    if (game.status === "Final" || 
        (typeof game.status === 'string' && game.status.toLowerCase().includes('final'))) {
      return true;
    }
    
    // Check if the game date is in the past
    const gameDate = formatDateForComparison(game.date);
    const today = getTodayDate();
    
    // If game date is before today and has a score, consider it finished
    if (gameDate < today && (game.home_team_score > 0 || game.visitor_team_score > 0)) {
      return true;
    }
    
    // If game is marked as played and has scores, consider it finished
    if (game.played && (game.home_team_score > 0 || game.visitor_team_score > 0)) {
      return true;
    }
    
    return false;
  };

  // Function to determine if a game is live
  const isGameLive = (game: Game): boolean => {
    // First check if period > 0 (game has started) and it's not final yet
    if (game.period && game.period > 0 && !isGameFinished(game)) {
      return true;
    }
    
    // Check for "In Progress" or "Live" in status (as seen in GameCarousel)
    if (typeof game.status === 'string') {
      const statusLower = game.status.toLowerCase();
      return statusLower.includes('progress') || 
             statusLower.includes('live') ||
             statusLower.includes('halftime') ||
             statusLower.includes('start') ||
             statusLower.includes('1st') ||
             statusLower.includes('2nd') ||
             statusLower.includes('3rd') ||
             statusLower.includes('4th') ||
             statusLower.includes('quarter') ||
             statusLower.includes('period') ||
             statusLower.includes('tipoff');
    }
    
    // For today's games, check if the scheduled start time has passed and the game isn't finished
    const now = new Date();
    const gameDate = new Date(game.date);
    const gameDay = formatDateForComparison(game.date);
    const today = getTodayDate();
    
    if (gameDay.getTime() === today.getTime()) {
      // It's a game scheduled for today
      // Only consider it live if the start time has passed AND at least one of:
      // 1. There's a score already
      // 2. It's marked as played
      if (now > gameDate && !isGameFinished(game)) {
        const hasScore = game.home_team_score > 0 || game.visitor_team_score > 0;
        const hasStarted = game.played || hasScore;
        // Only consider it live if there's evidence it's actually started
        return hasStarted;
      }
    }
    
    return false;
  };

  // Function to determine if a game is truly upcoming
  const isGameUpcoming = (game: Game): boolean => {
    // If it's live or finished, it's not upcoming
    if (isGameLive(game) || isGameFinished(game)) {
      return false;
    }
    
    // Check if the game date is today or in the future
    const gameDate = formatDateForComparison(game.date);
    const today = getTodayDate();
    
    // Game is upcoming if it's today or in the future
    return gameDate >= today;
  };

  // Function to find games for the player's team on a specific date
  const findGamesOnDate = (games: Game[], teamId: number, targetDate: Date): Game[] => {
    const targetDateStr = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return games.filter(game => {
      // Check if game is for this team
      const isTeamGame = game.home_team.id === teamId || game.visitor_team.id === teamId;
      
      // Check if game is on the target date
      const gameDate = new Date(game.date);
      const gameDateStr = gameDate.toISOString().split('T')[0];
      
      // For today's games, include all games that haven't finished
      if (targetDateStr === getTodayDate().toISOString().split('T')[0]) {
        return isTeamGame && gameDateStr === targetDateStr;
      }
      
      // For other dates, exclude finished games
      return isTeamGame && gameDateStr === targetDateStr && !isGameFinished(game);
    });
  };

  // Function to check for live game updates from the API
  const checkForLiveGames = useCallback(async () => {
    if (!player?.team?.id) return;
    
    try {
      // Use the centralized game data service
      const processedData = await gameDataService.getLiveGames(true); // Force refresh
      
      // Store the live games data
      setLiveGamesData(processedData);
      
      // Check for games involving this player's team
      const playerTeamGames = processedData.filter((game: Game) => 
        game.home_team.id === player.team.id || game.visitor_team.id === player.team.id
      );
      
      // If we found games for this player's team, force a state refresh
      if (playerTeamGames.length > 0) {
        if (isInitialLoad && process.env.NODE_ENV === 'development') {
          console.log(`[PlayerGameStatus] Found ${playerTeamGames.length} games for team ID: ${player.team.id}`);
        }
        setForceRefresh(prev => prev + 1);
        setLastCheck(Date.now());
      }
    } catch (error: unknown) {
      // Only log aborts in dev mode
      if ((error instanceof Error && error.name !== 'AbortError') || 
          process.env.NODE_ENV === 'development') {
        console.error('Error fetching live games:', error);
      }
    }
  }, [player?.team?.id, isInitialLoad]);

  // Function to check a specific game for live status directly
  const checkSpecificGame = useCallback(async (gameId: number) => {
    if (!gameId) return null;
    
    // Use the centralized game data service
    return await gameDataService.getGameById(gameId);
  }, []);

  // Function to find the most relevant game to display
  const determineRelevantGame = useCallback(async () => {
    if (!recentGames || recentGames.length === 0 || !player?.team?.id) {
      if (isInitialLoad) {
        setRelevantGame(null);
        setGameStatus(null);
      } else {
        // For updates, use the pending state
        setPendingGame(null);
        setPendingStatus(null);
      }
      return;
    }

    const now = new Date();
    const today = getTodayDate();
    const teamId = player.team.id;
    
    // Helper function to process games
    const processGames = (): Game[] => {
      // Combine recent games with live games data if available
      const allGames = [...recentGames];
      
      // Add any live games from liveGamesData that might not be in recentGames
      if (liveGamesData.length > 0) {
        liveGamesData.forEach(liveGame => {
          // Check if this live game involves the player's team
          if (liveGame.home_team.id === teamId || liveGame.visitor_team.id === teamId) {
            // Check if this game is already in the allGames array
            const existingGameIndex = allGames.findIndex(game => game.id === liveGame.id);
            
            if (existingGameIndex >= 0) {
              // Update the existing game with live data
              // Preserve any existing stats
              const existingStats = allGames[existingGameIndex].stats || { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
              const newStats = liveGame.stats || { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
              allGames[existingGameIndex] = {
                ...allGames[existingGameIndex],
                ...liveGame,
                stats: {
                  ...existingStats,
                  ...newStats
                }
              };
            } else {
              // Add the new live game
              // Ensure it has at least default stats
              if (!liveGame.stats) {
                liveGame.stats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
              }
              allGames.push(liveGame);
            }
          }
        });
      }
      return allGames;
    };

    // Process and get all games
    const allGames = processGames();

    // First check for today's games that might be live now
    const todayGames = findGamesOnDate(allGames, teamId, today);
    
    // Only log during initial load to reduce console spam
    if (isInitialLoad) {
      console.log(`[PlayerGameStatus] Found ${todayGames.length} games for today for player ${player.first_name} ${player.last_name}`);
      if (todayGames.length > 0) {
        console.log('[PlayerGameStatus] Today games:', todayGames.map(g => ({
          id: g.id,
          date: g.date,
          status: g.status,
          isLive: isGameLive(g),
          isFinished: isGameFinished(g),
          matchup: `${g.home_team.abbreviation} vs ${g.visitor_team.abbreviation}`
        })));
      }
    }
    
    // 1. CHECK EXISTING STATE: If we're already showing a live game, prioritize checking its status first
    // This prevents flipping back and forth between games
    if (relevantGame && gameStatus === 'live') {
      // Check if our current game is actually live
      const updatedLiveGame = await checkSpecificGame(relevantGame.id);
      
      if (updatedLiveGame) {
        // If it's still live, keep showing it
        if (isGameLive(updatedLiveGame) && !isGameFinished(updatedLiveGame)) {
          updateGameState(updatedLiveGame, 'live');
          return;
        }
        
        // If it's now finished, but within 3 hours, show as recent
        if (isGameFinished(updatedLiveGame)) {
          const gameEndTime = calculateGameEndTime(updatedLiveGame);
          const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
          
          if (gameEndTime > threeHoursAgo) {
            updateGameState(updatedLiveGame, 'recent');
            return;
          }
        }
      }
    }
    
    // 2. Find games that are explicitly marked as live
    let liveGame = allGames.find((game: Game) => 
      (game.home_team.id === teamId || game.visitor_team.id === teamId) && isGameLive(game)
    );
    
    // 3. For today's games that have a start time in the past but aren't marked as finished,
    // check them directly with the API to see if they're live
    if (!liveGame && todayGames.length > 0) {
      // Sort today's games by start time
      const sortedTodayGames = todayGames.sort((a: Game, b: Game) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Find games whose start time has passed
      for (const game of sortedTodayGames) {
        const gameTime = new Date(game.date);
        
        if (now > gameTime && !isGameFinished(game)) {
          // This game should have started - check its status directly
          const updatedGame = await checkSpecificGame(game.id);
          
          if (updatedGame) {
            if (isGameLive(updatedGame)) {
              liveGame = updatedGame;
              break;
            } else if (!isGameFinished(updatedGame)) {
              // If not explicitly marked as live but also not finished,
              // treat it as live if it should have started by now AND there's evidence it's started
              const scheduledStart = new Date(updatedGame.date);
              const twentyMinutesAgo = new Date(now.getTime() - (20 * 60 * 1000));
              const hasScoreOrPlayed = updatedGame.played || 
                                       updatedGame.home_team_score > 0 || 
                                       updatedGame.visitor_team_score > 0;
              
              // Only treat as live if:
              // 1. It was scheduled to start at least 20 minutes ago
              // 2. AND there's evidence it has actually started (scores or marked as played)
              if (scheduledStart < twentyMinutesAgo && hasScoreOrPlayed) {
                liveGame = updatedGame;
                // Force "live" status for games that should have started
                if (liveGame) {
                  liveGame.status = "In Progress";
                }
                break;
              }
            }
          }
        }
      }
    }

    if (liveGame) {
      updateGameState(liveGame, 'live');
      return;
    }

    // Find the most recently completed game (within 3 hours)
    const recentlyCompletedGames = allGames
      .filter((game: Game) => 
        (game.home_team.id === teamId || game.visitor_team.id === teamId) && 
        isGameFinished(game)
      )
      .sort((a: Game, b: Game) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (recentlyCompletedGames.length > 0) {
      const mostRecent = recentlyCompletedGames[0];
      const gameEndTime = calculateGameEndTime(mostRecent);
      
      // If the game ended within the last 3 hours
      const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      if (gameEndTime > threeHoursAgo) {
        // For games that just finished, ensure they have proper "Final" marking
        if (typeof mostRecent.status !== 'string' || 
            !mostRecent.status.toLowerCase().includes('final')) {
          mostRecent.status = "Final";
        }
        
        updateGameState(mostRecent, 'recent');
        return;
      }
    }

    // Find the next upcoming game - PRIORITIZE TODAY'S GAMES
    // First, check all of today's games regardless of start time to find games scheduled for today
    if (todayGames.length > 0) {
      // Sort games chronologically to get the next one
      const upcomingTodayGames = todayGames
        .filter((game: Game) => !isGameFinished(game)) // Include even games that might have a time in the past
        .sort((a: Game, b: Game) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (upcomingTodayGames.length > 0) {
        const nextGame = upcomingTodayGames[0];
        
        // Double-check if this game is actually upcoming or if it might be live but API data hasn't updated
        if (new Date(nextGame.date) <= now && !isGameFinished(nextGame)) {
          // The scheduled time has passed - this might be a live game that the API hasn't updated yet
          // For this case, we'll still show it as upcoming but note that it should be starting soon
          if (isInitialLoad) {
            console.log(`[PlayerGameStatus] Game ${nextGame.id} scheduled time has passed, but not marked as live yet`);
          }
        }
        
        updateGameState(nextGame, 'upcoming');
        return;
      }
    }
    
    // Find games in the next 7 days if no game today
    const upcomingGames: Game[] = [];
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      
      const gamesOnDate = findGamesOnDate(allGames, teamId, futureDate);
      upcomingGames.push(...gamesOnDate);
      
      if (upcomingGames.length > 0) break; // Stop once we find games
    }
    
    // If we found upcoming games in the next 7 days
    if (upcomingGames.length > 0) {
      // Sort chronologically to get the very next game
      upcomingGames.sort((a: Game, b: Game) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const nextGame = upcomingGames[0];
      updateGameState(nextGame, 'upcoming');
      return;
    }

    // Fallback: look for any future games if we couldn't find any in the next 7 days
    const allUpcomingGames = allGames
      .filter((game: Game) => 
        (game.home_team.id === teamId || game.visitor_team.id === teamId) && 
        isGameUpcoming(game)
      )
      .sort((a: Game, b: Game) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (allUpcomingGames.length > 0) {
      const nextGame = allUpcomingGames[0];
      updateGameState(nextGame, 'upcoming');
      return;
    }

    // If no relevant game found
    updateGameState(null, null);
  }, [recentGames, player?.team?.id, liveGamesData, checkSpecificGame, relevantGame, gameStatus, isInitialLoad]);

  // Helper function to update game state depending on whether it's initial load or update
  const updateGameState = (game: Game | null, status: 'live' | 'recent' | 'upcoming' | null) => {
    // Set the expiry time for recent games (3 hours after game end)
    if (status === 'recent' && game) {
      const gameEndTime = calculateGameEndTime(game);
      const expiryTime = new Date(gameEndTime.getTime() + (3 * 60 * 60 * 1000));
      setRecentGameExpiry(expiryTime.getTime());
    } else if (status !== 'recent') {
      // Reset expiry if we're not showing a recent game
      setRecentGameExpiry(null);
    }

    if (isInitialLoad) {
      // On initial load, update the main state directly
      setRelevantGame(game);
      setGameStatus(status);
    } else {
      // During updates, use the buffer state first
      setPendingGame(game);
      setPendingStatus(status);
    }
  };

  // Apply pending state updates in a controlled manner to prevent flickering
  useEffect(() => {
    if (!isInitialLoad && pendingGame !== null && !isLoading) {
      // Only apply changes if there's a meaningful difference
      const shouldUpdate = 
        !relevantGame || 
        relevantGame.id !== pendingGame.id || 
        gameStatus !== pendingStatus ||
        // For live games, also update if scores or period have changed
        (pendingStatus === 'live' && relevantGame && (
          relevantGame.home_team_score !== pendingGame.home_team_score ||
          relevantGame.visitor_team_score !== pendingGame.visitor_team_score ||
          relevantGame.period !== pendingGame.period ||
          relevantGame.time !== pendingGame.time
        ));

      if (shouldUpdate) {
        // Apply the pending state after a small delay
        const timeoutId = setTimeout(() => {
          setRelevantGame(pendingGame);
          setGameStatus(pendingStatus);
          setIsUpdating(false);
        }, 300); // Delay to ensure smooth transition
        
        return () => clearTimeout(timeoutId);
      } else {
        // No meaningful change, just clear updating state
        setIsUpdating(false);
      }
    } else if (!isInitialLoad && pendingGame === null && pendingStatus === null) {
      // Handle the null case
      if (relevantGame !== null || gameStatus !== null) {
        const timeoutId = setTimeout(() => {
          setRelevantGame(null);
          setGameStatus(null);
          setIsUpdating(false);
        }, 300);
        
        return () => clearTimeout(timeoutId);
      } else {
        setIsUpdating(false);
      }
    }
  }, [pendingGame, pendingStatus, isInitialLoad, isLoading, relevantGame, gameStatus]);

  // Generate a unique key for the current player to detect changes
  useEffect(() => {
    if (player?.team?.id) {
      const newKey = `${player.team.id}-${player.first_name}-${player.last_name}`;
      if (newKey !== currentPlayerKey) {
        console.log(`[PlayerGameStatus] Player key changed from "${currentPlayerKey}" to "${newKey}"`);
        setCurrentPlayerKey(newKey);
        setIsLoading(true);
      }
    }
  }, [player, currentPlayerKey]);

  // Reset state when player changes
  useEffect(() => {
    if (!player) return;
    
    // Check if this is a new player
    const currentPlayerId = player.team?.id; // Using team ID as we don't have player ID
    
    if (currentPlayerId !== playerId) {
      console.log('[PlayerGameStatus] New player detected, resetting state');
      setPlayerId(currentPlayerId);
      setRelevantGame(null);
      setGameStatus(null);
      setLiveGamesData([]);
      setForceRefresh(prev => prev + 1);
      setLastCheck(Date.now()); // Reset last check time
      setIsLoading(true); // Show loading state
      setIsInitialLoad(true); // Reset to initial load state for new player
      
      // Immediate forced check for the new player
      if (currentPlayerId) {
        setTimeout(() => {
          checkForLiveGames();
        }, 10); // Small delay to ensure state is updated
      }
    }
  }, [player, player?.team?.id, checkForLiveGames, playerId]);

  // Check for live games periodically (more frequently during game hours)
  useEffect(() => {
    // If we already have initial data, don't call immediately to avoid double loading
    if (!initialGameSet) {
      // Call once immediately
      checkForLiveGames();
    }
    
    // Set up periodic checks for live game updates
    // More frequent checks during prime game hours (7 PM - 11 PM ET)
    const intervalCheck = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Get current ET hour using Intl.DateTimeFormat API for better accuracy
      let etHour = hour;
      try {
        // Use a more reliable method to get ET time
        const etTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
        const etDate = new Date(etTime);
        etHour = etDate.getHours();
      } catch (e) {
        // Fallback to approximation if the timezone API fails
        if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/New_York') {
          etHour = (hour - 5 + 24) % 24; // UTC-5 for EST
        }
      }
      
      // Check more frequently if we're currently showing a live game
      const isShowingLiveGame = gameStatus === 'live';
      
      // Optimized frequency to balance updates and performance
      const checkInterval = isShowingLiveGame ? 45000 : // 45 seconds if showing live game
                            (etHour >= 19 && etHour <= 23) ? 90000 : // 90 seconds during prime time
                            180000; // otherwise 3 minutes
      
      const now2 = Date.now();
      if (now2 - lastCheck > checkInterval) {
        // Only perform background updates after initial load
        // Performance optimization for visible tabs only
        if (!isUpdating && document.visibilityState === 'visible') {
          setIsUpdating(true); // Mark that we're updating in the background
          checkForLiveGames();
        }
        setLastCheck(now2);
      }
    };
    
    // Reduce check frequency to reduce potential UI jitter
    const interval = setInterval(intervalCheck, 45000); // Check every 45 seconds to reduce unnecessary checks
    
    // Add visibility change listener to optimize for inactive tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Perform an update when tab becomes visible again
        const timeSinceLastCheck = Date.now() - lastCheck;
        if (timeSinceLastCheck > 60000) { // Only if it's been more than a minute
          setLastCheck(Date.now());
          checkForLiveGames();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForLiveGames, lastCheck, gameStatus, isInitialLoad, isUpdating, initialGameSet]);

  // Determine the most relevant game to display whenever data changes
  useEffect(() => {
    // Don't try to determine relevant game if we don't have player data
    if (!player?.team?.id) {
      setIsLoading(false);
      setIsInitialLoad(false);
      return;
    }
    
    // Only set loading state if this is the initial load
    if (isInitialLoad && !initialGameSet) {
      setIsLoading(true);
    }
    
    determineRelevantGame().then(() => {
      // Add slight delay before showing to ensure smooth transitions
      setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
        setIsUpdating(false);
      }, 5); // Reduced delay for faster rendering
    });
  }, [determineRelevantGame, recentGames, liveGamesData, forceRefresh, player?.team?.id, isInitialLoad, initialGameSet]);

  // Function to format period display
  const formatPeriod = (period?: number): string => {
    if (!period) return '';
    if (period <= 4) return `Q${period}`;
    return period === 5 ? 'OT' : `${period-4}OT`; // OT, 2OT, 3OT etc.
  };

  // Helper function to format game date
  const formatGameDate = (dateString: string): string => {
    try {
      const rawGameDate = dateString;
      
      if (rawGameDate.includes('-')) {
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1;
          const day = parseInt(gameDateParts[2]);
          
          const gameDate = new Date(Date.UTC(year, month, day));
          
          return gameDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
          });
        }
      }
      
      const gameDate = new Date(rawGameDate);
      return gameDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error(`Error formatting date ${dateString}:`, error);
      return "N/A";
    }
  };

  // If no game is found, don't render anything
  if (!relevantGame || !gameStatus) return null;
  
  // Only hide during initial loading, not during background updates
  if (isLoading && isInitialLoad && !initialGameSet) {
    return (
      <div className={`mt-1 bg-charcoal-800 rounded-lg p-1.5 w-full transition-all duration-300 shadow-lg max-w-xs mx-auto`}>
        {/* Match the layout of the expected content for smoother transition */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-charcoal-700 rounded-full mr-1 animate-pulse"></div>
            <div className="h-3 w-12 bg-charcoal-700 rounded animate-pulse"></div>
          </div>
          <div className="h-3 w-10 bg-charcoal-700 rounded animate-pulse"></div>
        </div>
        
        {/* Team score skeleton */}
        <div className="flex justify-between text-xs mb-1 px-0.5">
          <div className="h-4 w-8 bg-charcoal-700 rounded animate-pulse"></div>
          <div className="h-4 w-6 bg-charcoal-700 rounded animate-pulse"></div>
        </div>
        <div className="flex justify-between text-xs mb-1 px-0.5">
          <div className="h-4 w-8 bg-charcoal-700 rounded animate-pulse"></div>
          <div className="h-4 w-6 bg-charcoal-700 rounded animate-pulse"></div>
        </div>
        
        {/* Stats skeleton that matches the grid layout */}
        <div className="bg-charcoal-700 rounded-md px-1 py-1.5 text-[10px]">
          <div className="grid grid-cols-5 gap-1 mb-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-2 w-6 bg-charcoal-600 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-4 bg-charcoal-600 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const isHome = player?.team?.id === relevantGame.home_team.id;
  const playerTeam = isHome ? relevantGame.home_team : relevantGame.visitor_team;
  const opponentTeam = isHome ? relevantGame.visitor_team : relevantGame.home_team;
  const playerTeamScore = isHome ? relevantGame.home_team_score : relevantGame.visitor_team_score;
  const opponentTeamScore = isHome ? relevantGame.visitor_team_score : relevantGame.home_team_score;
  
  // Live game display
  if (gameStatus === 'live') {
    // Get current period and determine display text
    const period = relevantGame.period || 1;
    const periodText = period === 1 ? '1ST' : 
                      period === 2 ? '2ND' : 
                      period === 3 ? '3RD' : 
                      period === 4 ? '4TH' : 
                      `OT${period - 4}`;
    
    // Determine if player's team is winning
    const playerTeamWinning = playerTeamScore > opponentTeamScore;
    const playerTeamLosing = playerTeamScore < opponentTeamScore;
    const scoreDiff = Math.abs(playerTeamScore - opponentTeamScore);
    
    // Clock formatting - use relevantGame.time instead of clock
    const gameClock = relevantGame.time || '12:00';
    
    return (
      <div className={`mt-1 bg-charcoal-800 rounded-lg p-1 w-full ${isUpdating ? 'opacity-95' : 'opacity-100'} transition-all duration-500 shadow-lg max-w-xs mx-auto`}>
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center">
            <div className="relative">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 inline-block animate-pulse"></span>
            </div>
            <span className="text-red-500 font-semibold text-xs">LIVE</span>
          </div>
          <div className="text-xs text-grey-400 font-medium">
            <span>{periodText} • {gameClock}</span>
          </div>
        </div>
        
        {/* Score box with improved styling but more compact */}
        <div className="bg-charcoal-700 rounded-md p-1 mb-0.5">
          <div className="flex justify-between items-center mb-0.5">
            <div className="flex items-center">
              <div className="font-semibold text-xs text-white flex items-center">
                {playerTeamWinning && <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>}
                {playerTeam.abbreviation}
              </div>
              {isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
            <div className={`text-white font-bold text-xs ${playerTeamWinning ? 'text-green-400' : ''}`}>{playerTeamScore}</div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="font-semibold text-xs text-white flex items-center">
                {playerTeamLosing && <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>}
                {opponentTeam.abbreviation}
              </div>
              {!isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
            <div className={`text-white font-bold text-xs ${playerTeamLosing ? 'text-green-400' : ''}`}>{opponentTeamScore}</div>
          </div>
        </div>
        
        {/* Stats grid with improved organization and ultra-compact layout */}
        {relevantGame.stats && (
          <div className="bg-charcoal-700 rounded-md p-0.5 text-[8px]">
            {/* First row: Primary stats (PTS/REB/AST) */}
            <div className="grid grid-cols-3 gap-x-1 mb-0.5">
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">PTS</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.pts || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">REB</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.reb || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">AST</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.ast || 0}</span>
              </div>
            </div>
            
            {/* Second row: Secondary stats with more compact display */}
            <div className="grid grid-cols-5 gap-x-0.5">
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">STL</span>
                <span className="text-white text-[7px]">{relevantGame.stats.stl || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">BLK</span>
                <span className="text-white text-[7px]">{relevantGame.stats.blk || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">MIN</span>
                <span className="text-white text-[7px]">{relevantGame.stats.min || '0'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">FG</span>
                <span className="text-white text-[7px]">{relevantGame.stats.fgm || 0}-{relevantGame.stats.fga || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">3P</span>
                <span className="text-white text-[7px]">{relevantGame.stats.fg3m || 0}-{relevantGame.stats.fg3a || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Recent game display (finished within 3 hours)
  if (gameStatus === 'recent') {
    // Determine who won for styling
    const playerTeamWon = playerTeamScore > opponentTeamScore;
    const statusClass = playerTeamWon ? 'text-green-500' : 'text-red-500';
    const result = playerTeamWon ? 'W' : 'L';
    
    // Calculate how long ago the game ended
    const gameEndTime = calculateGameEndTime(relevantGame);
    const now = new Date();
    const minutesSinceGameEnd = Math.floor((now.getTime() - gameEndTime.getTime()) / (60 * 1000));
    
    // Calculate time until this view expires (3 hours after game end)
    let timeRemainingText = '';
    let timePercentage = 100;
    
    if (recentGameExpiry) {
      const timeLeft = recentGameExpiry - now.getTime();
      const minutesLeft = Math.max(0, Math.ceil(timeLeft / (60 * 1000)));
      
      if (minutesLeft > 60) {
        timeRemainingText = `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`;
      } else {
        timeRemainingText = `${minutesLeft}m`;
      }
      
      // Calculate percentage of time remaining (out of 3 hours)
      timePercentage = Math.min(100, Math.max(0, (timeLeft / (3 * 60 * 60 * 1000)) * 100));
    }
    
    // Format the time since game ended
    let timeAgoText = '';
    if (minutesSinceGameEnd < 60) {
      timeAgoText = `${minutesSinceGameEnd}m ago`;
    } else {
      const hoursAgo = Math.floor(minutesSinceGameEnd / 60);
      const remainingMinutes = minutesSinceGameEnd % 60;
      timeAgoText = `${hoursAgo}h ${remainingMinutes}m ago`;
    }
    
    return (
      <div className={`mt-1 bg-charcoal-800 rounded-lg p-1 w-full ${isUpdating ? 'opacity-95' : 'opacity-100'} transition-all duration-500 shadow-lg max-w-xs mx-auto`}>
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center">
            <span className={`font-semibold text-xs ${statusClass} flex items-center`}>
              <span className="mr-1">{playerTeamWon ? '✓' : '✗'}</span>
              FINAL • {result}
            </span>
          </div>
          <div className="text-xs text-grey-400 flex items-center">
            <span>{formatGameDate(relevantGame.date)}</span>
            <span className="ml-1 text-[7px] opacity-75">• {timeAgoText}</span>
          </div>
        </div>
        
        {/* Score box with improved styling but more compact */}
        <div className="bg-charcoal-700 rounded-md p-1 mb-0.5">
          <div className="flex justify-between items-center mb-0.5">
            <div className="flex items-center">
              <div className="font-semibold text-xs text-white flex items-center">
                {playerTeamWon && <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>}
                {playerTeam.abbreviation}
              </div>
              {isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
            <div className={`text-white font-bold text-xs ${playerTeamWon ? 'text-green-400' : ''}`}>{playerTeamScore}</div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="font-semibold text-xs text-white flex items-center">
                {!playerTeamWon && <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>}
                {opponentTeam.abbreviation}
              </div>
              {!isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
            <div className={`text-white font-bold text-xs ${!playerTeamWon ? 'text-green-400' : ''}`}>{opponentTeamScore}</div>
          </div>
        </div>
        
        {/* Stats grid with improved organization and ultra-compact layout */}
        {relevantGame.stats && (
          <div className="bg-charcoal-700 rounded-md p-0.5 text-[8px]">
            {/* First row: Primary stats (PTS/REB/AST) */}
            <div className="grid grid-cols-3 gap-x-1 mb-0.5">
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">PTS</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.pts || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">REB</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.reb || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[6px]">AST</span>
                <span className="text-white font-bold text-[9px]">{relevantGame.stats.ast || 0}</span>
              </div>
            </div>
            
            {/* Second row: Secondary stats with more compact display */}
            <div className="grid grid-cols-5 gap-x-0.5">
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">STL</span>
                <span className="text-white text-[7px]">{relevantGame.stats.stl || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">BLK</span>
                <span className="text-white text-[7px]">{relevantGame.stats.blk || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">MIN</span>
                <span className="text-white text-[7px]">{relevantGame.stats.min || '0'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">FG</span>
                <span className="text-white text-[7px]">{relevantGame.stats.fgm || 0}-{relevantGame.stats.fga || 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-grey-400 text-[5px]">3P</span>
                <span className="text-white text-[7px]">{relevantGame.stats.fg3m || 0}-{relevantGame.stats.fg3a || 0}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Progress indicator for the 3-hour window in more compact form */}
        {timeRemainingText && (
          <div className="mt-0.5">
            <div className="h-0.5 w-full bg-charcoal-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${timePercentage}%` }}
              ></div>
            </div>
            <div className="text-[5px] text-grey-500 text-center">
              Stats visible for {timeRemainingText} more
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Upcoming game display
  if (gameStatus === 'upcoming') {
    // Process the game time directly in the render function to ensure it's always up to date
    const displayTime = processGameTime(relevantGame);
    
    return (
      <div className={`mt-1 bg-charcoal-800 rounded-lg p-1 w-full ${isUpdating ? 'opacity-95' : 'opacity-100'} transition-all duration-500 shadow-lg max-w-xs mx-auto`}>
        <div className="flex justify-between items-center mb-0.5">
          <div className="text-xs text-blue-400 font-semibold flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
            NEXT GAME
          </div>
          <div className="text-xs text-grey-400">
            {formatGameDate(relevantGame.date)}
          </div>
        </div>
        
        <div className="bg-charcoal-700 rounded-md p-1 mb-0.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="font-semibold text-xs text-white">{playerTeam.abbreviation}</div>
              {isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
            <div className="text-xs text-grey-500 mx-1">vs</div>
            <div className="flex items-center justify-end">
              <div className="font-semibold text-xs text-white">{opponentTeam.abbreviation}</div>
              {!isHome && <span className="ml-1 text-[7px] text-grey-400">(HOME)</span>}
            </div>
          </div>
        </div>
        
        <div className="bg-charcoal-700 rounded-md p-1 text-center">
          <div className="text-xs text-grey-300 font-medium">
            {displayTime}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

// Export a memoized version of the component
const PlayerGameStatus = React.memo(PlayerGameStatusComponent, (prevProps, nextProps) => {
  // Only re-render if player or recentGames have changed
  return prevProps.player?.team?.id === nextProps.player?.team?.id && 
         prevProps.recentGames.length === nextProps.recentGames.length;
});

// Static global cache to avoid unnecessary fetches
const gameCache: Record<string, {data: Game, timestamp: number}> = {};

// Global prefetch function that can be called from parent components
export function prefetchPlayerGameData(teamId: number): void {
  // Use the centralized game data service
  gameDataService.prefetchTeamGames(teamId);
}

export default PlayerGameStatus; 
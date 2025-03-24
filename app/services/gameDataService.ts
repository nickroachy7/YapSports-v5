/**
 * Game Data Service
 * 
 * A centralized service for fetching, caching, and managing game data
 * to improve load times across the application.
 */

import { Game } from '../types/game';

// In-memory cache
const liveGamesCache: {
  data: Game[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const teamGamesCache: Record<string, {
  data: Game[];
  timestamp: number;
}> = {};

const singleGameCache: Record<string, {
  data: Game;
  timestamp: number;
}> = {};

/**
 * Get all live games with caching
 */
export async function getLiveGames(forceRefresh = false): Promise<Game[]> {
  const now = Date.now();
  const cacheAge = now - liveGamesCache.timestamp;
  
  // Use cache if available and less than 30 seconds old (unless refresh forced)
  if (!forceRefresh && liveGamesCache.data && cacheAge < 30000) {
    return liveGamesCache.data;
  }
  
  try {
    // Add timestamp to prevent browser caching
    const timestamp = now;
    const url = `/api/games?t=${timestamp}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch live games');
    }
    
    const responseData = await response.json();
    if (responseData?.data && Array.isArray(responseData.data)) {
      // Process and ensure stats are initialized
      const processedData = responseData.data.map((game: Game) => {
        if (!game.stats) {
          return {
            ...game,
            stats: {
              pts: 0,
              reb: 0,
              ast: 0,
              stl: 0,
              blk: 0
            }
          };
        }
        return game;
      });
      
      // Update cache
      liveGamesCache.data = processedData;
      liveGamesCache.timestamp = now;
      
      return processedData;
    }
    
    return [];
  } catch (error: unknown) {
    // If we have cached data, return it even if it's old
    if (liveGamesCache.data) {
      return liveGamesCache.data;
    }
    
    console.error('Error fetching live games:', error);
    return [];
  }
}

/**
 * Get games for a specific team
 */
export async function getTeamGames(teamId: number): Promise<Game[]> {
  if (!teamId) return [];
  
  const cacheKey = `team_${teamId}`;
  const now = Date.now();
  
  // Check cache first
  const cachedData = teamGamesCache[cacheKey];
  if (cachedData && now - cachedData.timestamp < 60000) { // 1 minute cache
    return cachedData.data;
  }
  
  try {
    // First get all live games
    const allGames = await getLiveGames();
    
    // Filter for this team
    const teamGames = allGames.filter(game => 
      game.home_team.id === teamId || game.visitor_team.id === teamId
    );
    
    if (teamGames.length > 0) {
      // Update cache
      teamGamesCache[cacheKey] = {
        data: teamGames,
        timestamp: now
      };
      
      return teamGames;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching games for team ${teamId}:`, error);
    return [];
  }
}

/**
 * Get a specific game by ID with caching
 */
export async function getGameById(gameId: number): Promise<Game | null> {
  if (!gameId) return null;
  
  const cacheKey = `game_${gameId}`;
  const now = Date.now();
  
  // Check cache first (valid for 60 seconds)
  const cachedGame = singleGameCache[cacheKey];
  if (cachedGame && now - cachedGame.timestamp < 60000) {
    return cachedGame.data;
  }
  
  try {
    // Check if we already have this game in the live games cache
    if (liveGamesCache.data) {
      const cachedLiveGame = liveGamesCache.data.find(game => game.id === gameId);
      if (cachedLiveGame) {
        // Update the single game cache
        singleGameCache[cacheKey] = {
          data: cachedLiveGame,
          timestamp: now
        };
        return cachedLiveGame;
      }
    }
    
    // Fetch from API if not in cache
    const timestamp = now;
    const url = `/api/games/${gameId}?t=${timestamp}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game ${gameId}`);
    }
    
    const data = await response.json();
    
    if (data?.data) {
      // Initialize default stats if they're missing
      if (!data.data.stats) {
        data.data.stats = {
          pts: 0,
          reb: 0,
          ast: 0,
          stl: 0,
          blk: 0
        };
      }
      
      // Update cache
      singleGameCache[cacheKey] = {
        data: data.data,
        timestamp: now
      };
      
      return data.data;
    }
    
    return null;
  } catch (error: unknown) {
    console.error(`Error fetching game ${gameId}:`, error);
    return null;
  }
}

/**
 * Prefetch game data for a team
 * This can be called early in the application lifecycle
 * to improve perceived performance
 */
export function prefetchTeamGames(teamId: number): void {
  if (!teamId) return;
  
  // Low priority fetch that won't block rendering
  setTimeout(() => {
    getTeamGames(teamId).catch(() => {
      // Silent fail for prefetch
    });
  }, 10);
}

/**
 * Reset all caches
 * Useful for testing or when user logs out
 */
export function resetGameDataCache(): void {
  liveGamesCache.data = null;
  liveGamesCache.timestamp = 0;
  
  Object.keys(teamGamesCache).forEach(key => {
    delete teamGamesCache[key];
  });
  
  Object.keys(singleGameCache).forEach(key => {
    delete singleGameCache[key];
  });
}
import { BalldontlieAPI } from "@balldontlie/sdk";

// Initialize the API client
const apiKey = process.env.API_KEY;
const api = new BalldontlieAPI({ apiKey: apiKey || "" });

/**
 * NBA API Service for handling all balldontlie API interactions
 */
export const nbaApiService = {
  /**
   * Get live box scores for today
   */
  getLiveBoxScores: async () => {
    try {
      // According to the docs, getLiveBoxScores() doesn't need parameters
      // It automatically returns all live games for the current day
      return await api.nba.getLiveBoxScores();
    } catch (error) {
      console.error("Error fetching live box scores:", error);
      return null;
    }
  },

  /**
   * Get box scores for a specific game
   */
  getBoxScores: async (gameId: number) => {
    try {
      // According to the docs, getBoxScores takes an options object with game_ids array
      return await api.nba.getBoxScores({
        game_ids: [gameId]
      } as any); // Type assertion to bypass TypeScript error
    } catch (error) {
      console.error(`Error fetching box scores for game ${gameId}:`, error);
      return null;
    }
  },

  /**
   * Get box scores for a specific date
   */
  getBoxScoresByDate: async (date: string) => {
    try {
      // According to the docs, you can also get box scores by date
      return await api.nba.getBoxScores({
        date: date
      } as any); // Type assertion to bypass TypeScript error
    } catch (error) {
      console.error(`Error fetching box scores for date ${date}:`, error);
      return null;
    }
  },

  /**
   * Get upcoming games for a team
   */
  getUpcomingGames: async (teamId: number, limit = 5) => {
    try {
      // Get today's date
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];

      // Get games for the specified team with date filtering
      const response = await api.nba.getGames({
        team_ids: [teamId],
        dates: [todayFormatted], // Today's games
        per_page: limit
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching upcoming games for team ${teamId}:`, error);
      return [];
    }
  },

  /**
   * Get player stats for specific games
   */
  getPlayerStats: async (playerId: number, gameIds: number[]) => {
    try {
      if (gameIds.length === 0) return [];
      
      const response = await api.nba.getStats({
        player_ids: [playerId],
        game_ids: gameIds
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching stats for player ${playerId}:`, error);
      return [];
    }
  },

  /**
   * Get games for a specific date range
   */
  getGamesInDateRange: async (teamId: number, startDate: string, endDate: string) => {
    try {
      const response = await api.nba.getGames({
        team_ids: [teamId],
        start_date: startDate,
        end_date: endDate
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching games in date range for team ${teamId}:`, error);
      return [];
    }
  }
};

/**
 * Game status helper functions that work with the BallDontLie API response format
 */
export const gameStatusHelpers = {
  /**
   * Check if a game is currently live
   */
  isGameLive: (game: any): boolean => {
    // Check for explicit status values first
    if (typeof game.status === 'string') {
      const status = game.status.toLowerCase();
      if (status.includes('live') || status.includes('in progress')) {
        return true;
      }
    }
    
    // If period > 0 and status isn't Final, consider it live
    return (game.period !== undefined && game.period > 0 && game.status !== "Final");
  },

  /**
   * Check if a game is finished
   */
  isGameFinished: (game: any): boolean => {
    // Check explicit game status values
    if (game.status === "Final" || 
        (typeof game.status === 'string' && 
         (game.status.toLowerCase().includes('final') || 
          game.status.toLowerCase() === 'finished'))) {
      return true;
    }
    
    // Check played flag if available
    if (game.played === true) {
      return true;
    }
    
    // Check if the game date is in the past and has scores
    const gameDate = new Date(game.date);
    gameDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (gameDate < today && (game.home_team_score > 0 || game.visitor_team_score > 0)) {
      return true;
    }
    
    return false;
  },

  /**
   * Check if a game is upcoming
   */
  isGameUpcoming: (game: any): boolean => {
    // If it's live or finished, it's not upcoming
    if (gameStatusHelpers.isGameLive(game) || gameStatusHelpers.isGameFinished(game)) {
      return false;
    }
    
    // Check for scheduled status
    if (typeof game.status === 'string' && 
        (game.status.toLowerCase().includes('scheduled') || 
         game.status.toLowerCase() === 'upcoming')) {
      return true;
    }
    
    // Check if the game date is today or in the future
    const gameDate = new Date(game.date);
    gameDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return gameDate >= today;
  }
}; 
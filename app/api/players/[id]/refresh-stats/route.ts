import { BalldontlieAPI } from "@balldontlie/sdk";
import { NextResponse } from "next/server";

// Initialize the API with the key from environment variables
const api = new BalldontlieAPI({ apiKey: process.env.API_KEY || "" });

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const playerId = params.id;

  console.log(`Refresh stats request received for player ID: ${playerId}`);

  if (!playerId) {
    console.error("Player ID is missing");
    return NextResponse.json(
      { error: "Player ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch player details to get team ID
    const playerResponse = await api.nba.getPlayer(Number(playerId));
    
    if (!playerResponse) {
      console.error(`No player found with ID: ${playerId}`);
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }
    
    // The API might return the player data in different formats
    const player = playerResponse.data || playerResponse;
    const teamId = player.team?.id || null;
    
    if (!teamId) {
      console.error(`No team ID found for player: ${playerId}`);
      return NextResponse.json(
        { error: "Player's team information not found" },
        { status: 400 }
      );
    }
    
    // Define interfaces for game data
    interface GameStats {
      game: { id: number };
      min: string;
      fgm: number;
      fga: number;
      fg_pct: number;
      fg3m: number;
      fg3a: number;
      fg3_pct: number;
      ftm: number;
      fta: number;
      ft_pct: number;
      oreb: number;
      dreb: number;
      reb: number;
      ast: number;
      stl: number;
      blk: number;
      turnover: number;
      pf: number;
      pts: number;
      [key: string]: any;
    }
    
    interface Game {
      id: number;
      date: string;
      home_team: any;
      home_team_score: number;
      visitor_team: any;
      visitor_team_score: number;
      played: boolean;
      stats: GameStats | null;
      [key: string]: any;
    }
    
    // Get all games for the player's team
    let hasMoreGames = true;
    let cursor: number | null = null;
    let allGames: any[] = [];
    
    // Fetch all games for the player's team with pagination
    while (hasMoreGames) {
      const paginationParams = cursor !== null ? { cursor } : {};
      
      const gamesResponse = await api.nba.getGames({
        seasons: [2024], // Current season
        team_ids: [teamId],
        ...paginationParams,
        per_page: 100
      });
      
      if (gamesResponse.data && gamesResponse.data.length > 0) {
        allGames = [...allGames, ...gamesResponse.data];
      }
      
      if (gamesResponse.meta && gamesResponse.meta.next_cursor) {
        cursor = gamesResponse.meta.next_cursor as number;
      } else {
        hasMoreGames = false;
      }
    }
    
    console.log(`Found ${allGames.length} games for team ID ${teamId}`);
    
    // Filter for games that should have been played
    // Use UTC for today to stay consistent with how we handle game dates
    const now = new Date();
    const today = new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ));
    today.setUTCHours(0, 0, 0, 0);
    
    const playedGames = allGames.filter(game => {
      // Fix timezone issues when handling the game date
      const rawGameDate = game.date; // Format: "2024-10-23" or similar
      
      // Create date with correct timezone adjustment
      const gameDateParts = rawGameDate.split('T')[0].split('-');
      const year = parseInt(gameDateParts[0]);
      const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
      const day = parseInt(gameDateParts[2]);
      
      // Use UTC date to avoid timezone issues
      const gameDate = new Date(Date.UTC(year, month, day));
      gameDate.setUTCHours(0, 0, 0, 0);
      
      // Only consider a game "played" if it's in the past AND has a final score
      // (both scores greater than 0 or status explicitly indicates it's finished)
      const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
      const datePassed = gameDate < today;
      
      // If status is available, check if it's "Final" or similar
      const isFinal = game.status ? 
        game.status.toLowerCase().includes("final") : false;
      
      return datePassed && (hasScores || isFinal);
    });
    
    console.log(`${playedGames.length} of these games have been played with scores`);
    
    // Get the latest stats for all games that have been played
    let hasMoreStats = true;
    cursor = null;
    let allPlayerStats: any[] = [];
    
    // Fetch all player stats with pagination
    while (hasMoreStats) {
      const paginationParams = cursor !== null ? { cursor } : {};
      
      const playerStatsResponse = await api.nba.getStats({
        player_ids: [Number(playerId)],
        seasons: [2024],
        ...paginationParams,
        per_page: 100
      });
      
      if (playerStatsResponse.data && playerStatsResponse.data.length > 0) {
        allPlayerStats = [...allPlayerStats, ...playerStatsResponse.data];
      }
      
      if (playerStatsResponse.meta && playerStatsResponse.meta.next_cursor) {
        cursor = playerStatsResponse.meta.next_cursor as number;
      } else {
        hasMoreStats = false;
      }
    }
    
    console.log(`Found ${allPlayerStats.length} game stats for player ID ${playerId}`);
    
    // For games that have been played but don't have stats, try to fetch box scores
    const missingStatsGames = playedGames.filter(game => 
      !allPlayerStats.some(stat => stat.game.id === game.id)
    );
    
    console.log(`${missingStatsGames.length} games are missing stats`);
    
    // Also check for games with dates in the past but no proper scores
    const pastGamesWithoutScores = allGames.filter(game => {
      // Fix timezone issues when handling the game date
      const rawGameDate = game.date;
      
      // Create date with correct timezone adjustment
      const gameDateParts = rawGameDate.split('T')[0].split('-');
      const year = parseInt(gameDateParts[0]);
      const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
      const day = parseInt(gameDateParts[2]);
      
      // Use UTC date to avoid timezone issues
      const gameDate = new Date(Date.UTC(year, month, day));
      gameDate.setUTCHours(0, 0, 0, 0);
      
      const datePassed = gameDate < today;
      const hasNoScores = game.home_team_score === 0 && game.visitor_team_score === 0;
      return datePassed && hasNoScores;
    });
    
    console.log(`${pastGamesWithoutScores.length} games have passed but don't have scores yet`);
    
    // Check specifically for more recent games (last 7 days)
    // These might need special handling
    const DAYS_TO_CHECK = 7;
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - DAYS_TO_CHECK);
    
    const recentPastGames = allGames.filter(game => {
      try {
        const rawGameDate = game.date;
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1;
          const day = parseInt(gameDateParts[2]);
          
          const gameDate = new Date(Date.UTC(year, month, day));
          gameDate.setUTCHours(0, 0, 0, 0);
          
          // Game is from the last DAYS_TO_CHECK days but before today
          return gameDate >= checkDate && gameDate < today;
        }
        return false;
      } catch (error) {
        console.error(`Error parsing date for recent game ${game.id}:`, error);
        return false;
      }
    });
    
    console.log(`${recentPastGames.length} games were played in the last ${DAYS_TO_CHECK} days`);
    
    // For any recent game that doesn't have scores or stats yet, we want to prioritize checking them
    const recentGamesNeedingUpdate = recentPastGames.filter(game => 
      (game.home_team_score === 0 && game.visitor_team_score === 0) || 
      !allPlayerStats.some(stat => stat.game.id === game.id)
    );
    
    if (recentGamesNeedingUpdate.length > 0) {
      console.log(`${recentGamesNeedingUpdate.length} recent games need priority updates`);
      
      // Try to get data for recent games directly first
      for (const game of recentGamesNeedingUpdate) {
        try {
          // Get the game details directly
          console.log(`Fetching details for recent game ID: ${game.id}`);
          const gameResponse = await api.nba.getGame(game.id);
          
          if (gameResponse && gameResponse.data) {
            const gameData = gameResponse.data;
            
            // Update scores if available
            if (gameData.home_team_score !== undefined && gameData.visitor_team_score !== undefined) {
              // Find the game in our collection
              const gameIndex = allGames.findIndex(g => g.id === game.id);
              
              if (gameIndex !== -1) {
                allGames[gameIndex].home_team_score = gameData.home_team_score;
                allGames[gameIndex].visitor_team_score = gameData.visitor_team_score;
                
                // Mark as played if it has scores
                if (gameData.home_team_score > 0 || gameData.visitor_team_score > 0) {
                  allGames[gameIndex].played = true;
                  console.log(`Updated scores for recent game ${game.id} using direct game data`);
                }
              }
            }
            
            // Try to get player stats for this specific game
            try {
              const gameStats = await api.nba.getStats({
                player_ids: [Number(playerId)],
                game_ids: [game.id]
              });
              
              if (gameStats.data && gameStats.data.length > 0) {
                // Add these stats to our collection
                const playerGameStats = gameStats.data[0];
                
                // Add to stats collection if not already there
                const existingStatIndex = allPlayerStats.findIndex(
                  stat => stat.game?.id === game.id
                );
                
                if (existingStatIndex === -1) {
                  allPlayerStats.push(playerGameStats);
                  console.log(`Added player stats for recent game ${game.id} using direct stats query`);
                } else if (!allPlayerStats[existingStatIndex].pts && playerGameStats.pts) {
                  allPlayerStats[existingStatIndex] = playerGameStats;
                  console.log(`Updated player stats for recent game ${game.id} using direct stats query`);
                }
              }
            } catch (statsError) {
              console.error(`Error fetching stats for recent game ${game.id}:`, statsError);
            }
          }
        } catch (gameError) {
          console.error(`Error fetching details for recent game ${game.id}:`, gameError);
        }
      }
    }
    
    // Combine both types of games that need updates
    const missingStatsGameIds = missingStatsGames.map(game => game.id);
    const pastGamesWithoutScoresIds = pastGamesWithoutScores.map(game => game.id);
    const recentGamesNeedingUpdateIds = recentGamesNeedingUpdate.map(game => game.id);
    
    // Use Array.from and spread to ensure we have a proper array with unique values
    const gamesToFetch = Array.from(new Set([
      ...recentGamesNeedingUpdateIds, // Prioritize recent games first
      ...missingStatsGameIds,
      ...pastGamesWithoutScoresIds
    ]));
    
    console.log(`Fetching box scores for ${gamesToFetch.length} total games`);
    
    if (gamesToFetch.length > 0) {
      // Get the IDs of games with missing stats or scores
      const gameIdsToFetch = gamesToFetch;
      
      // Process in chunks to avoid overloading the API
      const MAX_GAMES_PER_REQUEST = 10;
      
      for (let i = 0; i < gameIdsToFetch.length; i += MAX_GAMES_PER_REQUEST) {
        const chunk = gameIdsToFetch.slice(i, i + MAX_GAMES_PER_REQUEST);
        
        // Fetch box scores for these games
        try {
          console.log(`Fetching box scores for games ${i+1} to ${i+chunk.length} of ${gameIdsToFetch.length}`);
          
          const boxScoresResponse = await api.nba.getBoxScores({
            game_ids: chunk
          } as any); // Using type assertion to avoid TS error
          
          if (boxScoresResponse.data) {
            console.log(`Retrieved box scores for ${boxScoresResponse.data.length} games in this chunk`);
            
            // First, update game scores for all fetched box scores
            for (const boxScore of boxScoresResponse.data) {
              // Type assertion for the entire boxScore to avoid TypeScript errors
              const typedBoxScore = boxScore as any;
              
              if (typedBoxScore.game && typedBoxScore.game.id) {
                // Find the corresponding game in allGames
                const gameIndex = allGames.findIndex(game => game.id === typedBoxScore.game.id);
                
                if (gameIndex !== -1) {
                  // Update the game scores if they're available in the box score
                  if (typedBoxScore.home_team_score !== undefined && 
                      typedBoxScore.visitor_team_score !== undefined) {
                    allGames[gameIndex].home_team_score = typedBoxScore.home_team_score;
                    allGames[gameIndex].visitor_team_score = typedBoxScore.visitor_team_score;
                    
                    // If we got scores, the game was definitely played
                    if (typedBoxScore.home_team_score > 0 || typedBoxScore.visitor_team_score > 0) {
                      allGames[gameIndex].played = true;
                    }
                  }
                }
              }
              
              // Find the player in home or away team
              const homeTeamPlayer = typedBoxScore.home_team?.players?.find(
                (p: any) => p.player.id === Number(playerId)
              );
              
              const awayTeamPlayer = typedBoxScore.away_team?.players?.find(
                (p: any) => p.player.id === Number(playerId)
              );
              
              const playerBoxScore = homeTeamPlayer || awayTeamPlayer;
              
              if (playerBoxScore) {
                // Create a stats object in the same format as getStats() would return
                const playerStats = {
                  game: { id: typedBoxScore.game.id },
                  min: playerBoxScore.min || "0:00",
                  fgm: playerBoxScore.fgm || 0,
                  fga: playerBoxScore.fga || 0,
                  fg_pct: playerBoxScore.fga > 0 ? playerBoxScore.fgm / playerBoxScore.fga : 0,
                  fg3m: playerBoxScore.fg3m || 0,
                  fg3a: playerBoxScore.fg3a || 0,
                  fg3_pct: playerBoxScore.fg3a > 0 ? playerBoxScore.fg3m / playerBoxScore.fg3a : 0,
                  ftm: playerBoxScore.ftm || 0,
                  fta: playerBoxScore.fta || 0,
                  ft_pct: playerBoxScore.fta > 0 ? playerBoxScore.ftm / playerBoxScore.fta : 0,
                  oreb: playerBoxScore.oreb || 0,
                  dreb: playerBoxScore.dreb || 0,
                  reb: playerBoxScore.reb || 0,
                  ast: playerBoxScore.ast || 0,
                  stl: playerBoxScore.stl || 0,
                  blk: playerBoxScore.blk || 0,
                  turnover: playerBoxScore.turnover || 0,
                  pf: playerBoxScore.pf || 0,
                  pts: playerBoxScore.pts || 0
                };
                
                // Add to the player stats collection
                allPlayerStats.push(playerStats);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching box scores:", error);
        }
      }
    }
    
    // Process all games with updated stats
    const playerGames: Game[] = allGames.map(game => {
      // Find stats for this game
      const gameStats = allPlayerStats.find(stat => stat.game.id === game.id);
      
      // Fix timezone issues when handling the game date
      const rawGameDate = game.date;
      
      // Create date with correct timezone adjustment
      const gameDateParts = rawGameDate.split('T')[0].split('-');
      const year = parseInt(gameDateParts[0]);
      const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
      const day = parseInt(gameDateParts[2]);
      
      // Use UTC date to avoid timezone issues
      const gameDate = new Date(Date.UTC(year, month, day));
      gameDate.setUTCHours(0, 0, 0, 0);
      
      // A game is considered played if its date has passed AND it has non-zero scores
      const datePassed = gameDate < today;
      const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
      const played = datePassed && hasScores;
      
      return {
        ...game,
        played,
        stats: gameStats || null,
      };
    });
    
    // Sort games by date (chronological order)
    playerGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Returning ${playerGames.length} games with updated stats`);
    
    // Return the updated games
    return NextResponse.json({
      games: playerGames
    });
    
  } catch (error) {
    console.error("Error refreshing player stats:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to refresh player stats", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 
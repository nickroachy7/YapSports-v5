import { BalldontlieAPI } from "@balldontlie/sdk";
import { NextResponse } from "next/server";

// Initialize the API with the key from environment variables
const api = new BalldontlieAPI({ apiKey: process.env.API_KEY || "" });

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const playerId = params.id;

  console.log(`API request received for player ID: ${playerId}`);

  if (!playerId) {
    console.error("Player ID is missing");
    return NextResponse.json(
      { error: "Player ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch player details
    console.log(`Fetching details for player ID: ${playerId}`);
    const playerResponse = await api.nba.getPlayer(Number(playerId));
    
    // Log the raw player response to debug
    console.log("Raw player response:", JSON.stringify(playerResponse, null, 2));
    
    if (!playerResponse) {
      console.error(`No player found with ID: ${playerId}`);
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }
    
    // The API might return the player data in different formats
    // It could be directly in the response or under a 'data' property
    const player = playerResponse.data || playerResponse;
    
    console.log(`Successfully fetched player with ID: ${playerId}`);
    console.log("Extracted player data:", JSON.stringify(player, null, 2));
    
    // Log specific fields to debug
    console.log("Player height:", 
      player && 'height_feet' in player ? player.height_feet : undefined, 
      player && 'height_inches' in player ? player.height_inches : undefined
    );
    console.log("Player weight:", player && 'weight_pounds' in player ? player.weight_pounds : undefined);
    console.log("Player jersey_number:", player && 'jersey_number' in player ? player.jersey_number : undefined);
    console.log("Player college:", player && 'college' in player ? player.college : undefined);
    
    // Fetch season averages for the player (current season)
    const seasonAverages = await api.nba.getSeasonAverages({
      player_id: Number(playerId),
      season: 2024, // Updated to 2024 season
    });

    console.log(`Season averages data available: ${seasonAverages.data.length > 0}`);
    console.log("Season averages data:", JSON.stringify(seasonAverages.data[0], null, 2));

    // Fetch the player's team to get team ID
    const teamId = player.team?.id || null;
    
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
    
    // Fetch all games for the player's team in the 2024 season
    let playerGames: Game[] = [];
    
    if (teamId) {
      try {
        // Fetch all games for the player's team from the 2024 season using pagination
        let allGames: any[] = [];
        let hasMoreGames = true;
        let cursor: number | null = null;
        
        // Loop to handle pagination for games
        while (hasMoreGames) {
          const paginationParams = cursor !== null ? { cursor } : {};
          
          const gamesResponse = await api.nba.getGames({
            seasons: [2024], // 2024-2025 season
            team_ids: [teamId],
            ...paginationParams,
            per_page: 100 // Request maximum number of games per page
          });
          
          // Add the current page of games to our collection
          if (gamesResponse.data && gamesResponse.data.length > 0) {
            allGames = [...allGames, ...gamesResponse.data];
          }
          
          // Check if there are more pages to fetch
          if (gamesResponse.meta && gamesResponse.meta.next_cursor) {
            cursor = gamesResponse.meta.next_cursor as number;
          } else {
            hasMoreGames = false;
          }
        }
        
        console.log(`Found a total of ${allGames.length} games for team ID ${teamId} in 2024 season after pagination`);
        
        // Get player stats for the season for this player with pagination
        let allPlayerStats: any[] = [];
        let hasMoreStats = true;
        cursor = null;
        
        // Loop to handle pagination for player stats
        while (hasMoreStats) {
          const paginationParams = cursor !== null ? { cursor } : {};
          
          const playerStatsResponse = await api.nba.getStats({
            player_ids: [Number(playerId)],
            seasons: [2024],
            ...paginationParams,
            per_page: 100 // Request maximum number of stats per page
          });
          
          // Add the current page of stats to our collection
          if (playerStatsResponse.data && playerStatsResponse.data.length > 0) {
            allPlayerStats = [...allPlayerStats, ...playerStatsResponse.data];
          }
          
          // Check if there are more pages to fetch
          if (playerStatsResponse.meta && playerStatsResponse.meta.next_cursor) {
            cursor = playerStatsResponse.meta.next_cursor as number;
          } else {
            hasMoreStats = false;
          }
        }
        
        console.log(`Found a total of ${allPlayerStats.length} game stats for player ID ${playerId} in 2024 season after pagination`);
        
        // Use UTC for today to stay consistent with how we handle game dates
        const now = new Date();
        const today = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ));
        today.setUTCHours(0, 0, 0, 0);
        
        // Check for games with dates in the past but no proper scores or missing stats
        const pastGames = allGames.filter(game => {
          try {
            // Fix timezone issues when handling the game date
            const rawGameDate = game.date;
            
            // Create date with correct timezone adjustment
            const gameDateParts = rawGameDate.split('T')[0].split('-');
            if (gameDateParts.length === 3) {
              const year = parseInt(gameDateParts[0]);
              const month = parseInt(gameDateParts[1]) - 1;
              const day = parseInt(gameDateParts[2]);
              
              // Use UTC date to avoid timezone issues
              const gameDate = new Date(Date.UTC(year, month, day));
              gameDate.setUTCHours(0, 0, 0, 0);
              
              return gameDate < today;
            }
            return false;
          } catch (error) {
            console.error(`Error parsing date for game ${game.id}:`, error);
            return false;
          }
        });
        
        console.log(`Found ${pastGames.length} games that should have been played based on date`);
        
        // Identify past games missing stats or scores
        const gamesNeedingData = pastGames.filter(game => 
          // Missing player stats
          !allPlayerStats.some(stat => stat.game.id === game.id) || 
          // Or has 0-0 score (data not updated)
          (game.home_team_score === 0 && game.visitor_team_score === 0)
        );
        
        console.log(`${gamesNeedingData.length} past games need box scores or stats`);
        
        // If we have games needing data, fetch box scores for them
        if (gamesNeedingData.length > 0) {
          // For API safety, we'll process these in smaller chunks if needed
          // Some APIs have limits on how many ids can be passed at once
          const MAX_GAMES_PER_REQUEST = 10;
          const gameIdsToFetch = gamesNeedingData.map(game => game.id);
          
          // Process in chunks to avoid overloading the API
          for (let i = 0; i < gameIdsToFetch.length; i += MAX_GAMES_PER_REQUEST) {
            const chunk = gameIdsToFetch.slice(i, i + MAX_GAMES_PER_REQUEST);
            
            try {
              console.log(`Fetching box scores for games ${i+1} to ${i+chunk.length} of ${gameIdsToFetch.length}`);
              
              // Use the modified approach from refresh-stats route which is more reliable
              const boxScoresResponse = await api.nba.getBoxScores({
                game_ids: chunk
              } as any); // Using type assertion to avoid TS error
              
              if (boxScoresResponse.data && boxScoresResponse.data.length > 0) {
                console.log(`Retrieved box scores for ${boxScoresResponse.data.length} games in this chunk`);
                
                // Process each box score in this chunk
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
                    
                    // Add to player stats if not already in the collection
                    const existingStatIndex = allPlayerStats.findIndex(
                      stat => stat.game?.id === playerStats.game.id
                    );
                    
                    if (existingStatIndex === -1) {
                      // Add new stats
                      allPlayerStats.push(playerStats);
                    } else if (!allPlayerStats[existingStatIndex].pts && playerStats.pts) {
                      // Replace existing stats if they were empty
                      allPlayerStats[existingStatIndex] = playerStats;
                    }
                  }
                }
              }
            } catch (error) {
              // Log error but continue with next chunk
              console.error(`Error fetching box scores for games ${i+1} to ${i+chunk.length}:`, error);
            }
          }
        }
        
        // Check for games with dates in the very recent past (last 7 days)
        // These might need special handling as they might not be indexed yet
        const DAYS_TO_CHECK = 7;
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - DAYS_TO_CHECK);
        
        const recentGames = allGames.filter(game => {
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
        
        console.log(`Found ${recentGames.length} games from the last ${DAYS_TO_CHECK} days`);
        
        // For very recent games, check if they have been played but stats aren't updated yet
        if (recentGames.length > 0) {
          // Get any recent games that might be played but don't have scores
          const recentGamesWithoutScores = recentGames.filter(
            game => game.home_team_score === 0 && game.visitor_team_score === 0
          );
          
          if (recentGamesWithoutScores.length > 0) {
            console.log(`${recentGamesWithoutScores.length} recent games might need score updates`);
            
            try {
              // Group recent games by date to fetch box scores for each game directly
              console.log(`Attempting to fetch data for recent games individually`);
              
              for (const game of recentGamesWithoutScores) {
                try {
                  // Get the game details directly
                  console.log(`Fetching details for game ID: ${game.id}`);
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
                          console.log(`Updated scores for game ${game.id} using direct game data`);
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
                          console.log(`Added player stats for game ${game.id} using direct stats query`);
                        } else if (!allPlayerStats[existingStatIndex].pts && playerGameStats.pts) {
                          allPlayerStats[existingStatIndex] = playerGameStats;
                          console.log(`Updated player stats for game ${game.id} using direct stats query`);
                        }
                      }
                    } catch (statsError) {
                      console.error(`Error fetching stats for game ${game.id}:`, statsError);
                    }
                  }
                } catch (gameError) {
                  console.error(`Error fetching details for game ${game.id}:`, gameError);
                }
              }
              
              // Check which games still need special handling
              const stillMissingDataGames = recentGamesWithoutScores.filter(game => {
                // If game still has 0-0 score or still no player stats
                return (
                  (game.home_team_score === 0 && game.visitor_team_score === 0) ||
                  !allPlayerStats.some(stat => stat.game.id === game.id)
                );
              });
              
              // For games that still need checking, mark them for client-side handling
              if (stillMissingDataGames.length > 0) {
                console.log(`${stillMissingDataGames.length} recent games still need checking after trying direct data`);
                
                stillMissingDataGames.forEach(game => {
                  const gameIndex = allGames.findIndex(g => g.id === game.id);
                  if (gameIndex !== -1) {
                    // Add a flag for the frontend to know this needs checking
                    allGames[gameIndex].needsRecentCheck = true;
                  }
                });
              }
            } catch (error) {
              console.error("Error processing recent games:", error);
            }
          }
        }
        
        // Process game data with player stats and proper date handling
        playerGames = allGames.map(game => {
          // Find stats for this game
          const gameStats = allPlayerStats.find(stat => stat.game.id === game.id);
          
          // Fix timezone issues when handling the game date
          const rawGameDate = game.date;
          
          // Create date with correct timezone adjustment
          const gameDateParts = rawGameDate.split('T')[0].split('-');
          if (gameDateParts.length === 3) {
            const year = parseInt(gameDateParts[0]);
            const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
            const day = parseInt(gameDateParts[2]);
            
            // Use UTC date to avoid timezone issues
            const gameDate = new Date(Date.UTC(year, month, day));
            
            // A game is considered played if its date has passed AND it has non-zero scores
            const datePassed = gameDate < today;
            const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
            const played = datePassed && hasScores;
            
            return {
              ...game,
              played,
              stats: gameStats || null,
            };
          }
          
          // Fallback to original logic if we can't parse the date properly
          const gameDate = new Date(game.date);
          gameDate.setHours(0, 0, 0, 0);
          const played = gameDate < today;
          
          return {
            ...game,
            played,
            stats: gameStats || null,
          };
        });
        
        // Sort games by date (chronological order for better readability)
        playerGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      } catch (error) {
        console.error("Error fetching player games:", error);
      }
    }

    // If we don't have games yet, try an alternative approach to get the full schedule
    if (playerGames.length === 0 && teamId) {
      try {
        // We might need to use a different approach to get the full schedule
        console.log("No games found. Attempting to get full league schedule for 2024 season");
        
        // Get all games for the 2024 season (this could be a lot of data)
        const allSeasonGames = await api.nba.getGames({
          seasons: [2024],
          per_page: 100
        });
        
        // Filter games for the player's team
        const teamGames = allSeasonGames.data.filter(game => 
          game.home_team.id === teamId || game.visitor_team.id === teamId
        );
        
        console.log(`Found ${teamGames.length} games for team ID ${teamId} using full season approach`);
        
        // Process game data
        playerGames = teamGames.map(game => {
          // Calculate today's date to determine if game has been played
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const gameDate = new Date(game.date);
          gameDate.setHours(0, 0, 0, 0);
          const played = gameDate < today;
          
          return {
            ...game,
            played,
            stats: null, // No stats initially
          };
        });
        
        // Sort games by date (chronological order)
        playerGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // If we have any games from this approach, try to match stats to them
        if (playerGames.length > 0) {
          // Get player stats for the season
          const playerStatsResponse = await api.nba.getStats({
            player_ids: [Number(playerId)],
            seasons: [2024],
            per_page: 100
          });
          
          // Update games with stats where available
          playerGames = playerGames.map(game => {
            const gameStats = playerStatsResponse.data.find(stat => stat.game.id === game.id);
            return {
              ...game,
              stats: gameStats || null,
            };
          });
        }
      } catch (error) {
        console.error("Error fetching league schedule:", error);
      }
    }

    // Combine player details with season averages and games
    return NextResponse.json({
      player: player,
      seasonAverages: seasonAverages.data[0] || null,
      games: playerGames,
    });
  } catch (error) {
    console.error("Error fetching player details:", error);
    
    // Check if it's a known error type
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    
    return NextResponse.json(
      { error: "Failed to fetch player details", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 
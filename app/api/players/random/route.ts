import { BalldontlieAPI } from "@balldontlie/sdk";
import { NextResponse } from "next/server";

// Initialize the API with the key from environment variables
const api = new BalldontlieAPI({ apiKey: process.env.API_KEY || "" });

// Helper function to get a random number between min and max (inclusive)
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Define interfaces for game data
interface GameStats {
  pts: number;
  reb: number;
  ast: number;
  stl?: number;
  blk?: number;
  min?: string;
  fgm?: number;
  fga?: number;
  fg3m?: number;
  fg3a?: number;
  ftm?: number;
  fta?: number;
}

interface Game {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    full_name: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    abbreviation: string;
    full_name: string;
  };
  visitor_team_score: number;
  played: boolean;
  stats: GameStats | null;
}

export async function GET() {
  try {
    // Get a list of active players
    const response = await api.nba.getActivePlayers();
    
    if (!response.data || response.data.length === 0) {
      throw new Error('No active players found');
    }

    // Select a random player from the list
    const randomIndex = getRandomInt(0, response.data.length - 1);
    const randomPlayer = response.data[randomIndex];

    // Get season averages for the selected player
    const seasonAverages = await api.nba.getSeasonAverages({
      player_id: randomPlayer.id,
      season: 2024 // 2024-2025 season
    });

    // Map the season averages to our expected format
    const stats = seasonAverages.data[0];
    const mappedStats = stats ? {
      ppg: stats.pts,
      rpg: stats.reb,
      apg: stats.ast,
      fg_pct: stats.fg_pct,
      fg3_pct: stats.fg3_pct,
      ft_pct: stats.ft_pct,
      spg: stats.stl,
      bpg: stats.blk
    } : null;

    // Get player's games
    let playerGames: Game[] = [];
    try {
      // Using pagination to fetch all games for the player's team
      let hasMoreGames = true;
      let cursor: number | null = null;
      let allGames: any[] = [];
      
      // Fetch all team games with pagination to get the complete 82-game season
      while (hasMoreGames) {
        const paginationParams = cursor !== null ? { cursor } : {};
        
        const gamesResponse = await api.nba.getGames({
          seasons: [2024], // 2024-2025 season
          team_ids: [randomPlayer.team.id],
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
      
      console.log(`Found ${allGames.length} games for team ID ${randomPlayer.team.id}`);
      
      // Now fetch all player stats with pagination
      hasMoreGames = true;
      cursor = null;
      let allPlayerStats: any[] = [];
      
      while (hasMoreGames) {
        const paginationParams = cursor !== null ? { cursor } : {};
        
        const statsResponse = await api.nba.getStats({
          player_ids: [randomPlayer.id],
          seasons: [2024],
          ...paginationParams,
          per_page: 100
        });
        
        if (statsResponse.data && statsResponse.data.length > 0) {
          allPlayerStats = [...allPlayerStats, ...statsResponse.data];
        }
        
        if (statsResponse.meta && statsResponse.meta.next_cursor) {
          cursor = statsResponse.meta.next_cursor as number;
        } else {
          hasMoreGames = false;
        }
      }
      
      console.log(`Found ${allPlayerStats.length} stat entries for player ID ${randomPlayer.id}`);
      
      // Map games with stats
      playerGames = allGames.map(game => {
        // Find stats for this specific game
        const gameStats = allPlayerStats.find(
          stat => stat.game.id === game.id
        );
        
        // Simplify stats for the PlayerCard component
        const simplifiedStats = gameStats ? {
          pts: gameStats.pts || 0,
          reb: gameStats.reb || 0,
          ast: gameStats.ast || 0,
          stl: gameStats.stl || 0,
          blk: gameStats.blk || 0,
          min: gameStats.min || '0',
          fgm: gameStats.fgm || 0,
          fga: gameStats.fga || 0,
          fg3m: gameStats.fg3m || 0,
          fg3a: gameStats.fg3a || 0,
          ftm: gameStats.ftm || 0,
          fta: gameStats.fta || 0
        } : null;
        
        // Get current date in UTC
        const now = new Date();
        const today = new Date(Date.UTC(
          now.getFullYear(), 
          now.getMonth(), 
          now.getDate()
        ));
        
        // Parse game date properly
        let gameDate;
        try {
          const rawGameDate = game.date;
          const gameDateParts = rawGameDate.split('T')[0].split('-');
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
          const day = parseInt(gameDateParts[2]);
          
          gameDate = new Date(Date.UTC(year, month, day));
        } catch (e) {
          gameDate = new Date(game.date);
        }
        
        // Determine if game has been played
        const datePassed = gameDate < today;
        const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
        
        return {
          id: game.id,
          date: game.date,
          home_team: {
            id: game.home_team.id,
            abbreviation: game.home_team.abbreviation,
            full_name: game.home_team.full_name
          },
          home_team_score: game.home_team_score,
          visitor_team: {
            id: game.visitor_team.id,
            abbreviation: game.visitor_team.abbreviation,
            full_name: game.visitor_team.full_name
          },
          visitor_team_score: game.visitor_team_score,
          played: datePassed && (hasScores || (game.status ? game.status.toLowerCase().includes("final") : false)),
          stats: simplifiedStats
        };
      });
      
      // Add placeholder upcoming games to reach 82 if needed
      if (playerGames.length < 82) {
        console.log(`Adding ${82 - playerGames.length} placeholder games to reach full season`);
        
        // Sort existing games by date
        playerGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Get latest game date
        let lastGameDate = playerGames.length > 0 
          ? new Date(playerGames[playerGames.length - 1].date)
          : new Date();
        
        // Add placeholder future games
        for (let i = playerGames.length; i < 82; i++) {
          // Add 2-3 days for the next game
          lastGameDate = new Date(lastGameDate.getTime() + (2 + Math.floor(Math.random() * 2)) * 24 * 60 * 60 * 1000);
          
          const homeGame = Math.random() > 0.5;
          
          // Create a placeholder opponent (alternate between conferences)
          // This is just for demonstration - in a real app, we'd use actual schedule data
          const placeholderTeams = [
            { id: 1, abbreviation: "ATL", full_name: "Atlanta Hawks" },
            { id: 2, abbreviation: "BOS", full_name: "Boston Celtics" },
            { id: 3, abbreviation: "CLE", full_name: "Cleveland Cavaliers" },
            { id: 4, abbreviation: "LAL", full_name: "Los Angeles Lakers" },
            { id: 5, abbreviation: "GSW", full_name: "Golden State Warriors" }
          ];
          
          const opponentIndex = Math.floor(Math.random() * placeholderTeams.length);
          const opponent = placeholderTeams[opponentIndex];
          
          playerGames.push({
            id: 100000 + i, // Use high IDs to avoid conflicts
            date: lastGameDate.toISOString().split('T')[0],
            home_team: homeGame ? randomPlayer.team : opponent,
            home_team_score: 0,
            visitor_team: homeGame ? opponent : randomPlayer.team,
            visitor_team_score: 0,
            played: false,
            stats: null
          });
        }
      }
    } catch (error) {
      console.error("Error fetching player games:", error);
      // Continue with the player data even if games can't be fetched
    }

    // Return the player with their season averages and games
    return NextResponse.json({
      first_name: randomPlayer.first_name,
      last_name: randomPlayer.last_name,
      position: randomPlayer.position,
      jersey_number: randomPlayer.jersey_number,
      team: {
        id: randomPlayer.team.id,
        full_name: randomPlayer.team.full_name
      },
      season_averages: mappedStats,
      recentGames: playerGames
    });

  } catch (error) {
    console.error("Error fetching random player:", error);
    return NextResponse.json(
      { error: "Failed to fetch random player" },
      { status: 500 }
    );
  }
} 
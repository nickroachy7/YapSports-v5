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

    // Return the player with their season averages
    return NextResponse.json({
      first_name: randomPlayer.first_name,
      last_name: randomPlayer.last_name,
      position: randomPlayer.position,
      jersey_number: randomPlayer.jersey_number,
      team: {
        full_name: randomPlayer.team.full_name
      },
      season_averages: mappedStats
    });

  } catch (error) {
    console.error("Error fetching random player:", error);
    return NextResponse.json(
      { error: "Failed to fetch random player" },
      { status: 500 }
    );
  }
} 
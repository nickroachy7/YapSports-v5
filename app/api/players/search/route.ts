import { BalldontlieAPI } from "@balldontlie/sdk";
import { NextResponse } from "next/server";

// Initialize the API with the key from environment variables
const api = new BalldontlieAPI({ apiKey: process.env.API_KEY || "" });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ players: [] });
  }

  try {
    // Search for players using the name parameter
    const response = await api.nba.getPlayers({
      search: query,
    });

    return NextResponse.json({ players: response.data });
  } catch (error) {
    console.error("Error searching players:", error);
    return NextResponse.json({ error: "Failed to search players" }, { status: 500 });
  }
} 
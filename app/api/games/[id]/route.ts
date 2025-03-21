import { NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

// Ensure API key is properly typed
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is not defined in environment variables');
}

const api = new BalldontlieAPI({ apiKey });

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }
    
    // Get timestamp for cache busting
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('t') || Date.now().toString();
    
    console.log(`Fetching game with ID: ${gameId} (timestamp: ${timestamp})`);
    
    // Fetch game details
    const gameResponse = await api.nba.getGame(parseInt(gameId));
    
    if (!gameResponse || !gameResponse.data) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = gameResponse.data;
    console.log(`Retrieved game: ${game.id} - ${game.home_team.full_name} vs ${game.visitor_team.full_name}`);
    
    // Create the response with no-cache headers
    const response = NextResponse.json({ 
      data: game
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching game details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details' },
      { status: 500 }
    );
  }
} 
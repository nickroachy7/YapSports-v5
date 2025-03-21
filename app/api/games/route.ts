import { NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

// Ensure API key is properly typed
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is not defined in environment variables');
}

const api = new BalldontlieAPI({ apiKey });

export async function GET(request: Request) {
  try {
    // Get the date from the query parameters or use today's date
    const { searchParams } = new URL(request.url);
    
    // Get today's date in YYYY-MM-DD format based on the local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;
    
    // Use the date from query params if provided, otherwise use today
    const dateParam = searchParams.get('date');
    const formattedDate = dateParam || todayFormatted;
    
    // Get a timestamp for cache busting
    const timestamp = searchParams.get('t') || Date.now().toString();
    
    console.log(`Fetching games for date: ${formattedDate} (timestamp: ${timestamp})`);
    
    // Fetch games for the specified date
    const gamesResponse = await api.nba.getGames({
      dates: [formattedDate],
    });
    
    console.log(`Found ${gamesResponse.data.length} games for ${formattedDate}`);
    
    // If no games are found for today and we're using today's date, try tomorrow
    if (gamesResponse.data.length === 0 && !dateParam) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      const tomorrowYear = tomorrow.getFullYear();
      const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowFormatted = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
      
      console.log(`No games found for today, trying tomorrow: ${tomorrowFormatted}`);
      
      const tomorrowGamesResponse = await api.nba.getGames({
        dates: [tomorrowFormatted],
      });
      
      console.log(`Found ${tomorrowGamesResponse.data.length} games for tomorrow`);
      
      const response = NextResponse.json({ 
        data: tomorrowGamesResponse.data,
        meta: tomorrowGamesResponse.meta,
        date: tomorrowFormatted,
        isToday: false
      });
      
      // Add cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }
    
    const response = NextResponse.json({ 
      data: gamesResponse.data,
      meta: gamesResponse.meta,
      date: formattedDate,
      isToday: formattedDate === todayFormatted
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
} 
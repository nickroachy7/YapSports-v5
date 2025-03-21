import { NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

// Ensure API key is properly typed
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is not defined in environment variables');
}

const api = new BalldontlieAPI({ apiKey });

// Define a type for player stats totals
interface TeamTotals {
  min: number;
  pts: number;
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
  [key: string]: number; // Index signature to allow string indexing
}

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
    
    console.log(`Fetching stats for game with ID: ${gameId}`);
    
    // Get timestamp from request (for cache busting)
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('t') || Date.now().toString();
    console.log(`Request timestamp: ${timestamp}`);
    
    // Fetch stats for the game
    const statsResponse = await api.nba.getStats({
      game_ids: [parseInt(gameId)],
      per_page: 100, // Ensure we get all players' stats
    });
    
    if (!statsResponse || !statsResponse.data) {
      return NextResponse.json(
        { error: 'Stats not found for this game' },
        { status: 404 }
      );
    }
    
    // Get game details as well
    const gameResponse = await api.nba.getGame(parseInt(gameId));
    
    if (!gameResponse || !gameResponse.data) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = gameResponse.data;
    
    // Organize stats by team
    const homeTeamStats = statsResponse.data.filter(
      stat => stat.team.id === game.home_team.id
    );
    
    const visitorTeamStats = statsResponse.data.filter(
      stat => stat.team.id === game.visitor_team.id
    );
    
    // Get team totals
    const calculateTeamTotals = (teamStats: any[]): TeamTotals => {
      const totals: TeamTotals = {
        min: 0,
        pts: 0,
        fgm: 0,
        fga: 0,
        fg_pct: 0,
        fg3m: 0,
        fg3a: 0,
        fg3_pct: 0,
        ftm: 0,
        fta: 0,
        ft_pct: 0,
        oreb: 0,
        dreb: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        turnover: 0,
        pf: 0,
      };
      
      teamStats.forEach(stat => {
        Object.keys(totals).forEach(key => {
          if (key !== 'fg_pct' && key !== 'fg3_pct' && key !== 'ft_pct') {
            if (key === 'min') {
              // Handle minutes format (may be "MM:SS" format)
              const minutes = stat[key] ? stat[key].split(':')[0] : 0;
              totals[key] += parseInt(minutes) || 0;
            } else {
              totals[key] += stat[key] || 0;
            }
          }
        });
      });
      
      // Calculate percentages
      totals.fg_pct = totals.fga > 0 ? (totals.fgm / totals.fga) : 0;
      totals.fg3_pct = totals.fg3a > 0 ? (totals.fg3m / totals.fg3a) : 0;
      totals.ft_pct = totals.fta > 0 ? (totals.ftm / totals.fta) : 0;
      
      return totals;
    };
    
    const homeTeamTotals = calculateTeamTotals(homeTeamStats);
    const visitorTeamTotals = calculateTeamTotals(visitorTeamStats);
    
    console.log(`Retrieved stats for game: ${game.id} - ${game.home_team.full_name} vs ${game.visitor_team.full_name}`);
    
    // Create the response with no-cache headers
    const response = NextResponse.json({ 
      game: game,
      homeTeam: {
        info: game.home_team,
        players: homeTeamStats,
        totals: homeTeamTotals
      },
      visitorTeam: {
        info: game.visitor_team,
        players: visitorTeamStats,
        totals: visitorTeamTotals
      }
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game stats' },
      { status: 500 }
    );
  }
} 
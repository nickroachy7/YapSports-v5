import { NextResponse } from 'next/server'
import { BalldontlieAPI } from '@balldontlie/sdk'

const api = new BalldontlieAPI({ apiKey: process.env.API_KEY! })

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Fetch all games in the date range
    const gamesResponse = await api.nba.getGames({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      per_page: 100
    })

    const games = gamesResponse.data || []
    
    // Fetch stats for all games
    const statsResponse = await api.nba.getStats({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      per_page: 100
    })

    const stats = statsResponse.data || []

    // Calculate team performance metrics
    const teamPerformance = calculateTeamPerformance(games, stats)
    const fantasyFriendlyTeams = identifyFantasyFriendlyTeams(teamPerformance)

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        gamesAnalyzed: games.length
      },
      teamPerformance,
      fantasyInsights: {
        bestOffensiveTeams: fantasyFriendlyTeams.offensive.slice(0, 5),
        fastestPaceTeams: fantasyFriendlyTeams.pace.slice(0, 5),
        highestScoringGames: fantasyFriendlyTeams.highScoring.slice(0, 5)
      }
    })

  } catch (error) {
    console.error('Error fetching team performance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch team performance data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

function calculateTeamPerformance(games: any[], stats: any[]) {
  const teamStats: Record<number, {
    teamId: number,
    teamName: string,
    abbreviation: string,
    gamesPlayed: number,
    totalPoints: number,
    totalPointsAllowed: number,
    wins: number,
    losses: number,
    fantasyPointsGenerated: number
  }> = {}

  // Initialize team data from games
  games.forEach(game => {
    const homeTeam = game.home_team
    const awayTeam = game.visitor_team

    if (!teamStats[homeTeam.id]) {
      teamStats[homeTeam.id] = {
        teamId: homeTeam.id,
        teamName: homeTeam.name,
        abbreviation: homeTeam.abbreviation,
        gamesPlayed: 0,
        totalPoints: 0,
        totalPointsAllowed: 0,
        wins: 0,
        losses: 0,
        fantasyPointsGenerated: 0
      }
    }

    if (!teamStats[awayTeam.id]) {
      teamStats[awayTeam.id] = {
        teamId: awayTeam.id,
        teamName: awayTeam.name,
        abbreviation: awayTeam.abbreviation,
        gamesPlayed: 0,
        totalPoints: 0,
        totalPointsAllowed: 0,
        wins: 0,
        losses: 0,
        fantasyPointsGenerated: 0
      }
    }

    // Update game stats if game is finished
    if (game.status === 'Final') {
      const homeStats = teamStats[homeTeam.id]
      const awayStats = teamStats[awayTeam.id]

      homeStats.gamesPlayed++
      awayStats.gamesPlayed++

      homeStats.totalPoints += game.home_team_score || 0
      awayStats.totalPoints += game.visitor_team_score || 0

      homeStats.totalPointsAllowed += game.visitor_team_score || 0
      awayStats.totalPointsAllowed += game.home_team_score || 0

      if ((game.home_team_score || 0) > (game.visitor_team_score || 0)) {
        homeStats.wins++
        awayStats.losses++
      } else {
        homeStats.losses++
        awayStats.wins++
      }
    }
  })

  // Add fantasy points from player stats
  stats.forEach(stat => {
    const teamId = stat.team.id
    if (teamStats[teamId]) {
      teamStats[teamId].fantasyPointsGenerated += calculateFantasyPoints(stat)
    }
  })

  // Calculate averages and return sorted by fantasy points
  return Object.values(teamStats)
    .map(team => ({
      ...team,
      averagePointsScored: team.gamesPlayed > 0 ? Math.round((team.totalPoints / team.gamesPlayed) * 10) / 10 : 0,
      averagePointsAllowed: team.gamesPlayed > 0 ? Math.round((team.totalPointsAllowed / team.gamesPlayed) * 10) / 10 : 0,
      winPercentage: team.gamesPlayed > 0 ? Math.round((team.wins / team.gamesPlayed) * 1000) / 10 : 0,
      averageFantasyPointsPerGame: team.gamesPlayed > 0 ? Math.round((team.fantasyPointsGenerated / team.gamesPlayed) * 10) / 10 : 0
    }))
    .sort((a, b) => b.averageFantasyPointsPerGame - a.averageFantasyPointsPerGame)
}

function identifyFantasyFriendlyTeams(teamPerformance: any[]) {
  return {
    offensive: teamPerformance
      .sort((a, b) => b.averagePointsScored - a.averagePointsScored)
      .map(team => ({
        team: team.abbreviation,
        avgPoints: team.averagePointsScored,
        fantasyPoints: team.averageFantasyPointsPerGame
      })),
    pace: teamPerformance
      .sort((a, b) => (b.averagePointsScored + b.averagePointsAllowed) - (a.averagePointsScored + a.averagePointsAllowed))
      .map(team => ({
        team: team.abbreviation,
        totalPoints: Math.round((team.averagePointsScored + team.averagePointsAllowed) * 10) / 10,
        fantasyPoints: team.averageFantasyPointsPerGame
      })),
    highScoring: teamPerformance
      .filter(team => team.averagePointsScored > 110)
      .sort((a, b) => b.averageFantasyPointsPerGame - a.averageFantasyPointsPerGame)
      .map(team => ({
        team: team.abbreviation,
        avgPoints: team.averagePointsScored,
        fantasyPoints: team.averageFantasyPointsPerGame
      }))
  }
}

function calculateFantasyPoints(stat: any): number {
  const points = (stat.pts || 0) * 1
  const rebounds = (stat.reb || 0) * 1.2
  const assists = (stat.ast || 0) * 1.5
  const steals = (stat.stl || 0) * 3
  const blocks = (stat.blk || 0) * 3
  const turnovers = (stat.turnover || 0) * -1
  const threePointers = (stat.fg3m || 0) * 0.5

  const total = points + rebounds + assists + steals + blocks + turnovers + threePointers
  return Math.round(total * 100) / 100
} 
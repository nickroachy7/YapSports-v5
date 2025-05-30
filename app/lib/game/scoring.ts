import { RARITIES, type Rarity } from '@/app/lib/constants/rarities'

export interface PlayerStats {
  minutes: string | null
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  threePointersMade: number
  threePointersAttempted: number
  freeThrowsMade: number
  freeThrowsAttempted: number
}

export interface LineupCard {
  cardId: string
  playerId: number
  playerName: string
  position: string
  rarity: string
  appliedTokenId?: string
  contractsRemaining: number
}

export interface TokenEffect {
  id: string
  name?: string // Token name from database
  type: string
  effect_type?: string // New database field
  effect_value?: number // New database field
  description: string
  effect?: any // Legacy effect structure
}

// Calculate base fantasy points from real NBA stats
export function calculateBaseFantasyPoints(stats: PlayerStats): number {
  const points = stats.points * 1
  const rebounds = stats.rebounds * 1.2
  const assists = stats.assists * 1.5
  const steals = stats.steals * 3
  const blocks = stats.blocks * 3
  const turnovers = stats.turnovers * -1
  const threePointers = stats.threePointersMade * 0.5

  const total = points + rebounds + assists + steals + blocks + turnovers + threePointers
  return Math.round(total * 100) / 100
}

// Apply token effects to base fantasy points
export function applyTokenEffects(
  basePoints: number, 
  stats: PlayerStats, 
  tokenEffects: TokenEffect[]
): { finalPoints: number; tokenBreakdown: any[] } {
  let finalPoints = basePoints
  const tokenBreakdown: any[] = []

  for (const token of tokenEffects) {
    let tokenBonus = 0
    const effect = token.effect || token // Handle both old and new token formats
    
    // NEW: Handle our new token database structure
    const effectType = token.effect_type || effect.effect || effect.type
    const effectValue = token.effect_value || effect.value || effect.multiplier || 1
    
    switch (effectType) {
      case 'score_multiplier':
        // Simple score multiplier - multiply total points by the effect value
        tokenBonus = basePoints * (effectValue - 1) // e.g., 1.5x means add 0.5x original
        tokenBreakdown.push({
          tokenId: token.id,
          tokenName: token.name || token.description,
          type: 'score_multiplier',
          description: `${effectValue}x score multiplier`,
          multiplier: effectValue,
          basePoints: basePoints,
          bonus: tokenBonus
        })
        break

      case 'stat_threshold':
        // Add bonus if player hits a certain fantasy point threshold
        const threshold = 25 // Default threshold for "25+ Points Bonus" token
        if (basePoints >= threshold) {
          tokenBonus = effectValue // Add the effect value as bonus points
          tokenBreakdown.push({
            tokenId: token.id,
            tokenName: token.name || token.description,
            type: 'stat_threshold_met',
            description: `${threshold}+ fantasy points bonus`,
            fantasyPoints: basePoints,
            threshold: threshold,
            bonus: tokenBonus
          })
        } else {
          tokenBreakdown.push({
            tokenId: token.id,
            tokenName: token.name || token.description,
            type: 'stat_threshold_missed',
            description: `${threshold}+ fantasy points bonus (not met)`,
            fantasyPoints: basePoints,
            threshold: threshold,
            bonus: 0
          })
        }
        break

      case 'contract_add':
        // Contract tokens don't affect scoring, they add contracts
        // This should be handled in the contract application logic
        tokenBreakdown.push({
          tokenId: token.id,
          tokenName: token.name || token.description,
          type: 'contract_add',
          description: `Added ${effectValue} contract(s)`,
          bonus: 0 // No score bonus, just contract addition
        })
        break

      case 'score_variance':
        // Risk/reward token - 50% chance to multiply, 50% chance to reduce
        const isGoodOutcome = Math.random() < 0.5
        if (isGoodOutcome) {
          tokenBonus = basePoints // Double the score
          tokenBreakdown.push({
            tokenId: token.id,
            tokenName: token.name || token.description,
            type: 'risk_reward_high',
            description: 'Risk/Reward: High outcome!',
            outcome: 'double',
            bonus: tokenBonus
          })
        } else {
          tokenBonus = -basePoints * 0.5 // Reduce score by half
          tokenBreakdown.push({
            tokenId: token.id,
            tokenName: token.name || token.description,
            type: 'risk_reward_low',
            description: 'Risk/Reward: Low outcome',
            outcome: 'reduce',
            bonus: tokenBonus
          })
        }
        break

      // LEGACY: Support for old token formats
      case 'multiplier':
        tokenBonus = basePoints * (effectValue - 1)
        tokenBreakdown.push({
          tokenId: token.id,
          type: 'multiplier',
          description: token.description,
          multiplier: effectValue,
          bonus: tokenBonus
        })
        break

      case 'threshold':
        if (basePoints >= (effect.threshold || 25)) {
          tokenBonus = effect.bonus || effectValue || 5
          tokenBreakdown.push({
            tokenId: token.id,
            type: 'threshold_met',
            description: token.description,
            fantasyPoints: basePoints,
            threshold: effect.threshold || 25,
            bonus: tokenBonus
          })
        } else {
          tokenBreakdown.push({
            tokenId: token.id,
            type: 'threshold_missed',
            description: token.description,
            fantasyPoints: basePoints,
            threshold: effect.threshold || 25,
            bonus: 0
          })
        }
        break

      default:
        console.warn(`Unknown token effect type: ${effectType}`)
        tokenBreakdown.push({
          tokenId: token.id,
          tokenName: token.name || token.description,
          type: 'unknown',
          description: `Unknown effect: ${effectType}`,
          bonus: 0
        })
    }

    finalPoints += tokenBonus
  }

  return {
    finalPoints: Math.round(finalPoints * 100) / 100,
    tokenBreakdown
  }
}

// Calculate total lineup score
export function calculateLineupScore(
  lineup: LineupCard[],
  playerStats: Record<number, PlayerStats>,
  appliedTokens: Record<string, TokenEffect[]>
): {
  totalScore: number
  playerScores: any[]
  breakdown: any
} {
  const playerScores: any[] = []
  let totalScore = 0

  for (const card of lineup) {
    const stats = playerStats[card.playerId]
    
    if (!stats) {
      // Player didn't play or no stats available
      playerScores.push({
        cardId: card.cardId,
        playerId: card.playerId,
        playerName: card.playerName,
        position: card.position,
        rarity: card.rarity,
        score: 0,
        reason: 'No stats available'
      })
      continue
    }

    // Calculate base fantasy points
    const basePoints = calculateBaseFantasyPoints(stats)
    
    // Apply token effects if any
    const tokens = appliedTokens[card.cardId] || []
    const { finalPoints, tokenBreakdown } = applyTokenEffects(basePoints, stats, tokens)

    const playerScore = {
      cardId: card.cardId,
      playerId: card.playerId,
      playerName: card.playerName,
      position: card.position,
      rarity: card.rarity,
      baseFantasyPoints: basePoints,
      tokenEffects: tokenBreakdown,
      finalScore: finalPoints,
      stats
    }

    playerScores.push(playerScore)
    totalScore += finalPoints
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    playerScores,
    breakdown: {
      totalPlayers: lineup.length,
      playersWithStats: playerScores.filter(p => p.finalScore > 0).length
    }
  }
}

// Helper function to get stat value by name
function getStatValue(stats: PlayerStats, statName: string): number {
  switch (statName) {
    case 'points': return stats.points
    case 'rebounds': return stats.rebounds
    case 'assists': return stats.assists
    case 'steals': return stats.steals
    case 'blocks': return stats.blocks
    case 'turnovers': return stats.turnovers
    case 'threePointers': return stats.threePointersMade
    case 'fieldGoals': return stats.fieldGoalsMade
    case 'freeThrows': return stats.freeThrowsMade
    default: return 0
  }
}

// Validate lineup before scoring
export function validateLineup(lineup: LineupCard[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for required positions
  const positions = ['PG', 'SG', 'SF', 'PF', 'C']
  const lineupPositions = lineup.map(card => card.position)
  
  for (const position of positions) {
    if (!lineupPositions.includes(position)) {
      errors.push(`Missing ${position} position`)
    }
  }
  
  // Check for valid contracts
  const expiredCards = lineup.filter(card => card.contractsRemaining <= 0)
  if (expiredCards.length > 0) {
    errors.push(`${expiredCards.length} cards have expired contracts`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 
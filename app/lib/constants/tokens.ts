// Token templates and definitions

export type TokenType = 
  | 'stat_threshold'
  | 'multiplier'
  | 'risk_reward'
  | 'contract_modifier'
  | 'team_synergy'

export interface TokenTemplate {
  id: string
  type: TokenType
  name: string
  description: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  effect: (playerStats: any, lineupStats?: any) => {
    points: number
    contracts: number
  }
}

export const TOKEN_TEMPLATES: TokenTemplate[] = [
  // Common Tokens
  {
    id: 'double_double',
    type: 'stat_threshold',
    name: 'Double-Double Hunter',
    description: 'If player records a double-double, +10 points',
    rarity: 'common',
    effect: (stats) => {
      const categories = [stats.pts, stats.reb, stats.ast, stats.stl, stats.blk]
      const doubleDigits = categories.filter(stat => stat >= 10).length
      return {
        points: doubleDigits >= 2 ? 10 : 0,
        contracts: 0
      }
    }
  },
  {
    id: 'scorer_basic',
    type: 'stat_threshold',
    name: 'Bucket Getter',
    description: 'If player scores 20+ points, +8 points',
    rarity: 'common',
    effect: (stats) => ({
      points: stats.pts >= 20 ? 8 : 0,
      contracts: 0
    })
  },
  {
    id: 'rebounder_basic',
    type: 'stat_threshold',
    name: 'Glass Cleaner',
    description: 'If player grabs 10+ rebounds, +8 points',
    rarity: 'common',
    effect: (stats) => ({
      points: stats.reb >= 10 ? 8 : 0,
      contracts: 0
    })
  },
  
  // Uncommon Tokens
  {
    id: 'three_point_specialist',
    type: 'multiplier',
    name: '3-Point Specialist',
    description: '2x points for every 3-pointer made',
    rarity: 'uncommon',
    effect: (stats) => ({
      points: stats.fg3m * 2 * 3, // 3 points per 3PM, doubled
      contracts: 0
    })
  },
  {
    id: 'defensive_anchor',
    type: 'stat_threshold',
    name: 'Defensive Anchor',
    description: 'If player records 3+ blocks or steals, +15 points',
    rarity: 'uncommon',
    effect: (stats) => ({
      points: (stats.blk + stats.stl) >= 3 ? 15 : 0,
      contracts: 0
    })
  },
  
  // Rare Tokens
  {
    id: 'high_risk_scorer',
    type: 'risk_reward',
    name: 'Go Big or Go Home',
    description: '-10 if under 15 points, +25 if over 30 points',
    rarity: 'rare',
    effect: (stats) => ({
      points: stats.pts < 15 ? -10 : (stats.pts > 30 ? 25 : 0),
      contracts: 0
    })
  },
  {
    id: 'triple_double_chase',
    type: 'stat_threshold',
    name: 'Triple-Double Chase',
    description: 'If player records a triple-double, +40 points',
    rarity: 'rare',
    effect: (stats) => {
      const categories = [stats.pts, stats.reb, stats.ast, stats.stl, stats.blk]
      const doubleDigits = categories.filter(stat => stat >= 10).length
      return {
        points: doubleDigits >= 3 ? 40 : 0,
        contracts: 0
      }
    }
  },
  
  // Epic Tokens
  {
    id: 'contract_extender',
    type: 'contract_modifier',
    name: 'Contract Extension',
    description: 'If player scores 25+ points, add 2 contracts',
    rarity: 'epic',
    effect: (stats) => ({
      points: 0,
      contracts: stats.pts >= 25 ? 2 : 0
    })
  },
  {
    id: 'team_chemistry',
    type: 'team_synergy',
    name: 'Team Chemistry',
    description: '+20 if 3+ teammates score 15+ points',
    rarity: 'epic',
    effect: (stats, lineupStats) => {
      if (!lineupStats) return { points: 0, contracts: 0 }
      const highScorers = lineupStats.filter((p: any) => p.pts >= 15).length
      return {
        points: highScorers >= 3 ? 20 : 0,
        contracts: 0
      }
    }
  },
  
  // Legendary Tokens
  {
    id: 'legendary_performance',
    type: 'multiplier',
    name: 'Legendary Performance',
    description: '1.5x total fantasy points if player scores 40+ points',
    rarity: 'legendary',
    effect: (stats) => {
      if (stats.pts >= 40) {
        const fantasyPoints = calculateFantasyPoints(stats)
        return {
          points: fantasyPoints * 0.5, // Add 50% more
          contracts: 0
        }
      }
      return { points: 0, contracts: 0 }
    }
  },
  {
    id: 'infinite_contracts',
    type: 'contract_modifier',
    name: 'Eternal Card',
    description: 'If player has a 20-10-5 game, card gains 5 contracts',
    rarity: 'legendary',
    effect: (stats) => ({
      points: 0,
      contracts: (stats.pts >= 20 && stats.reb >= 10 && stats.ast >= 5) ? 5 : 0
    })
  }
]

// Helper function to calculate base fantasy points
function calculateFantasyPoints(stats: any): number {
  return (
    stats.pts * 1 +
    stats.reb * 1.2 +
    stats.ast * 1.5 +
    stats.stl * 3 +
    stats.blk * 3 -
    stats.turnover * 1
  )
}

// Get random token based on rarity
export function getRandomToken(rarity?: string): TokenTemplate {
  const filteredTokens = rarity 
    ? TOKEN_TEMPLATES.filter(t => t.rarity === rarity)
    : TOKEN_TEMPLATES
  
  return filteredTokens[Math.floor(Math.random() * filteredTokens.length)]
} 
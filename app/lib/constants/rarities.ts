// Rarity definitions and constants - Original YapSports system

export const RARITIES = {
  base: {
    name: 'Token Base',
    color: '#6B7280', // gray-500
    baseContracts: 3,
    quickSellValue: 50,
    scoreMultiplier: 1.0,
    packOdds: 0.65 // 65%
  },
  role_player: {
    name: 'Role Player',
    color: '#10B981', // green-500
    baseContracts: 5,
    quickSellValue: 100,
    scoreMultiplier: 1.15,
    packOdds: 0.25 // 25%
  },
  starter: {
    name: 'Starter',
    color: '#3B82F6', // blue-500
    baseContracts: 7,
    quickSellValue: 250,
    scoreMultiplier: 1.3,
    packOdds: 0.08 // 8%
  },
  all_star: {
    name: 'Base',
    color: '#6B7280', // gray-500 (base tier color)
    baseContracts: 3,
    quickSellValue: 50,
    scoreMultiplier: 1.0,
    packOdds: 0.65 // 65%
  },
  legend: {
    name: 'Legend',
    color: '#F59E0B', // amber-500
    baseContracts: 15,
    quickSellValue: 1000,
    scoreMultiplier: 2.0,
    packOdds: 0.001 // 0.1%
  }
} as const

export type Rarity = keyof typeof RARITIES

// Helper function to get a random rarity based on odds
export function getRandomRarity(): Rarity {
  const random = Math.random()
  let cumulative = 0
  
  for (const [rarity, config] of Object.entries(RARITIES)) {
    cumulative += config.packOdds
    if (random < cumulative) {
      return rarity as Rarity
    }
  }
  
  return 'base' // Fallback
} 
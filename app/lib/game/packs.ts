// Pack opening logic and definitions

import { Card } from '../supabase'
import { generateRandomCard, addCardToUserInventory } from './cards'
import { type Rarity } from '../constants/rarities'
import { createClient } from '../supabase'

export interface PackType {
  id: string
  name: string
  description: string
  cost: number
  cardCount: number
  guaranteedRarities?: Rarity[]
  playerCards: number
  tokenCards: number
}

export const PACK_TYPES: Record<string, PackType> = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    description: 'Get started with 10 base-tier player cards and 3 tokens!',
    cost: 0,
    cardCount: 13,
    playerCards: 10,
    tokenCards: 3
  },
  bronze: {
    id: 'bronze',
    name: 'Small Pack',
    description: '4 cards with 3 players and 1 token',
    cost: 5,
    cardCount: 4,
    playerCards: 3,
    tokenCards: 1
  },
  silver: {
    id: 'silver',
    name: 'Large Pack',
    description: '5 cards with 3 players and 2 tokens',
    cost: 10,
    cardCount: 5,
    playerCards: 3,
    tokenCards: 2
  },
  gold: {
    id: 'gold',
    name: 'Premium Pack',
    description: '5 cards with 3 players and 2 tokens, higher rarity chance',
    cost: 20,
    cardCount: 5,
    playerCards: 3,
    tokenCards: 2
  }
}

// Generate cards for a pack
export async function generatePackCards(packType: PackType): Promise<Card[]> {
  const cards: Card[] = []
  
  // For starter pack, ensure position balance with all base-tier cards
  if (packType.id === 'starter') {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C']
    
    // Generate 2 players for each position - all base tier (all_star is lowest available for players)
    for (const position of positions) {
      // Get two base-tier players for this position
      const firstCard = await generateRandomCard('player', 'all_star')
      cards.push(firstCard)
      
      const secondCard = await generateRandomCard('player', 'all_star')
      cards.push(secondCard)
    }
    
    // Add 3 base-tier tokens
    for (let i = 0; i < 3; i++) {
      const tokenCard = await generateRandomCard('token', 'base')
      cards.push(tokenCard)
    }
    
    return cards
  }
  
  // For all other packs, generate base-tier cards
  // Generate player cards - all base tier (all_star is lowest available for players)
  for (let i = 0; i < packType.playerCards; i++) {
    const card = await generateRandomCard('player', 'all_star')
    cards.push(card)
  }
  
  // Generate token cards - all base tier
  for (let i = 0; i < packType.tokenCards; i++) {
    const card = await generateRandomCard('token', 'base')
    cards.push(card)
  }
  
  // Fill remaining slots with base-tier cards if needed
  while (cards.length < packType.cardCount) {
    const card = await generateRandomCard('player', 'all_star')
    cards.push(card)
  }
  
  return cards
}

// Open a pack for a user
export async function openPack(userId: string, packTypeId: string): Promise<{
  cards: Card[]
  userCards: any[]
  error?: string
}> {
  const packType = PACK_TYPES[packTypeId]
  if (!packType) {
    return { cards: [], userCards: [], error: 'Invalid pack type' }
  }
  
  const supabase = createClient()
  
  // Check if user has enough coins (skip for starter pack)
  if (packType.cost > 0) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('coins, packs_opened')
      .eq('id', userId)
      .single()
    
    if (userError) {
      return { cards: [], userCards: [], error: 'Failed to fetch user data' }
    }
    
    if (user.coins < packType.cost) {
      return { cards: [], userCards: [], error: 'Insufficient coins' }
    }
    
    // Deduct coins
    const { error: deductError } = await supabase
      .from('users')
      .update({ 
        coins: user.coins - packType.cost,
        packs_opened: user.packs_opened + 1
      })
      .eq('id', userId)
    
    if (deductError) {
      return { cards: [], userCards: [], error: 'Failed to deduct coins' }
    }
  } else {
    // Just update pack count for free packs
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('packs_opened')
      .eq('id', userId)
      .single()
    
    if (userError) {
      return { cards: [], userCards: [], error: 'Failed to fetch user data' }
    }
    
    await supabase
      .from('users')
      .update({ 
        packs_opened: user.packs_opened + 1
      })
      .eq('id', userId)
  }
  
  // Generate the cards
  const cards = await generatePackCards(packType)
  
  // Add cards to user's inventory
  const userCards = []
  for (const card of cards) {
    try {
      const userCard = await addCardToUserInventory(userId, card.id)
      userCards.push({ ...userCard, card })
    } catch (error) {
      console.error('Failed to add card to inventory:', error)
    }
  }
  
  return { cards, userCards }
}

// Check if user has opened starter pack
export async function hasOpenedStarterPack(userId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('packs_opened')
    .eq('id', userId)
    .single()
  
  if (error || !data) return false
  return data.packs_opened > 0
}

export { addCardToUserInventory } from './cards' 
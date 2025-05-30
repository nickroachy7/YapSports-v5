// Card generation and management logic

import { createClient } from '../supabase'
import { Card, UserCard } from '../supabase'
import { RARITIES, getRandomRarity, type Rarity } from '../constants/rarities'
import { TOKEN_TEMPLATES, getRandomToken } from '../constants/tokens'

// No mapping needed - using original rarity system directly
// Rarity type is now the same as database values

// Get all available player cards from the database
export async function getAvailablePlayerCards(rarity?: Rarity) {
  const supabase = createClient()
  
  let query = supabase
    .from('cards')
    .select('*')
    .eq('card_type', 'player')
  
  if (rarity) {
    query = query.eq('rarity', rarity)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data as Card[]
}

// Get all available token cards from the database
export async function getAvailableTokenCards(rarity?: Rarity) {
  const supabase = createClient()
  
  let query = supabase
    .from('cards')
    .select('*')
    .eq('card_type', 'token')
  
  if (rarity) {
    query = query.eq('rarity', rarity)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data as Card[]
}

// Generate a random card based on pack type
export async function generateRandomCard(packType: 'player' | 'token' | 'any' = 'any', guaranteedRarity?: Rarity): Promise<Card> {
  const rarity = guaranteedRarity || getRandomRarity()
  
  if (packType === 'token') {
    const tokens = await getAvailableTokenCards(rarity)
    if (tokens.length === 0) {
      // If no tokens of this rarity, get any token
      const allTokens = await getAvailableTokenCards()
      if (allTokens.length === 0) {
        throw new Error('No token cards available in database')
      }
      return allTokens[Math.floor(Math.random() * allTokens.length)]
    }
    return tokens[Math.floor(Math.random() * tokens.length)]
  }
  
  if (packType === 'player') {
    const players = await getAvailablePlayerCards(rarity)
    if (players.length === 0) {
      // If no players of this rarity, get any player
      const allPlayers = await getAvailablePlayerCards()
      if (allPlayers.length === 0) {
        throw new Error('No player cards available in database')
      }
      return allPlayers[Math.floor(Math.random() * allPlayers.length)]
    }
    return players[Math.floor(Math.random() * players.length)]
  }
  
  // For 'any' type, randomly choose between player and token
  const type = Math.random() < 0.7 ? 'player' : 'token' // 70% chance for player, 30% for token
  return generateRandomCard(type, rarity)
}

// Add a card to user's inventory
export async function addCardToUserInventory(userId: string, cardId: string): Promise<UserCard> {
  const supabase = createClient()
  
  // Get the card details to determine initial contracts
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single()
  
  if (cardError) throw cardError
  
  // Create user card entry
  const { data, error } = await supabase
    .from('user_cards')
    .insert({
      user_id: userId,
      card_id: cardId,
      contracts_remaining: card.base_contracts,
      contracts_used: 0,
      in_lineup: false
    })
    .select()
    .single()
  
  if (error) throw error
  return data as UserCard
}

// Get user's card inventory for a specific team
export async function getUserInventory(userId: string, teamId?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('user_cards')
    .select(`
      *,
      card:cards(*)
    `)
    .eq('user_id', userId)
    .order('acquired_date', { ascending: false })
  
  if (teamId) {
    query = query.eq('team_id', teamId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

// Quick sell cards for team tokens
export async function quickSellCards(userId: string, userCardIds: string[], teamId: string): Promise<number> {
  const supabase = createClient()
  
  // Get the cards to calculate total value
  const { data: userCards, error: fetchError } = await supabase
    .from('user_cards')
    .select('*, card:cards(*)')
    .eq('user_id', userId)
    .eq('team_id', teamId) // Only sell cards belonging to this team
    .in('id', userCardIds)
  
  if (fetchError) throw fetchError
  
  // Calculate total team tokens (using the renamed column)
  const totalTokens = userCards.reduce((sum, uc) => sum + uc.card.team_token_value, 0)
  
  // Delete the cards
  const { error: deleteError } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .in('id', userCardIds)
  
  if (deleteError) throw deleteError
  
  // Update team's token balance
  const { data: teamCurrency, error: currencyError } = await supabase
    .from('team_currency')
    .select('team_tokens')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single()
  
  if (currencyError) throw currencyError
  
  const { error: updateError } = await supabase
    .from('team_currency')
    .update({ 
      team_tokens: teamCurrency.team_tokens + totalTokens,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('team_id', teamId)
  
  if (updateError) throw updateError
  
  return totalTokens
}

// Get cards by position for lineup building (team-specific)
export async function getUserCardsByPosition(userId: string, teamId: string, position?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('user_cards')
    .select(`
      *,
      card:cards(*)
    `)
    .eq('user_id', userId)
    .eq('team_id', teamId) // Only show cards for this team
    .eq('card.card_type', 'player')
    .gt('contracts_remaining', 0) // Only show cards with contracts
    .eq('in_lineup', false) // Only show cards not already in lineup
  
  if (position) {
    query = query.eq('card.player_position', position)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
} 
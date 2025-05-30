import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Type definitions for our database tables
export type User = {
  id: string
  email: string
  username: string
  coins: number
  packs_opened: number
  daily_streak: number
  created_at: string
  last_active: string
}

export type Card = {
  id: string
  card_type: 'player' | 'token'
  player_id?: number
  player_name?: string
  player_position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C'
  token_type?: string
  token_description?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'base' | 'role_player' | 'starter' | 'all_star' | 'legend'
  base_contracts: number
  team_token_value: number
  special_attributes: Record<string, any>
  created_at: string
}

export type UserCard = {
  id: string
  user_id: string
  card_id: string
  acquired_date: string
  contracts_remaining: number
  contracts_used: number
  in_lineup: boolean
  lineup_position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C'
  applied_token_id?: string
}

export type DailyLineup = {
  id: string
  user_id: string
  game_date: string
  lineup_data: Record<string, any>
  total_score?: number
  rank?: number
  rewards_claimed: boolean
  submitted_at: string
} 
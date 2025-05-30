import { Card as CardType } from '@/app/lib/supabase';

export interface UserCardWithCard {
  id: string;
  contracts_remaining: number;
  contracts_used: number;
  card: CardType;
  in_lineup: boolean;
  lineup_position?: string;
  applied_token_id?: string;
}

export interface Lineup {
  PG: UserCardWithCard | null;
  SG: UserCardWithCard | null;
  SF: UserCardWithCard | null;
  PF: UserCardWithCard | null;
  C: UserCardWithCard | null;
}

export interface Team {
  id: string;
  name: string;
  hasClaimedStarter?: boolean;
}

export interface TokenInfo {
  id: string;
  type: string;
  effect?: string;
  description?: string;
}

export interface PackType {
  name: string;
  cost: number;
  cardCount: number;
  playerCards: number;
  tokenCards: number;
} 
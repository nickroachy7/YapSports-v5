import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { UserCardWithCard } from '../../types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => 'team-1'),
  }),
}));

jest.mock('@/app/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    isLoading: false,
  }),
}));

jest.mock('@/app/context/CoinsContext', () => ({
  useCoins: () => ({
    coins: 1000,
    setCoins: jest.fn(),
    refreshCoins: jest.fn(),
    updateCoins: jest.fn(),
  }),
}));

describe('useGameState', () => {
  const mockPlayerCard: UserCardWithCard = {
    id: 'player-1',
    contracts_remaining: 5,
    contracts_used: 0,
    card: {
      id: 'player-1',
      card_type: 'player',
      player_name: 'LeBron James',
      player_position: 'SF',
      rarity: 'legend',
      base_contracts: 10,
      quick_sell_value: 500,
      special_attributes: {},
      created_at: '2024-01-01',
    },
    in_lineup: false,
  };

  const mockTokenCard: UserCardWithCard = {
    id: 'token-1',
    contracts_remaining: 1,
    contracts_used: 0,
    card: {
      id: 'token-1',
      card_type: 'token',
      token_type: 'score_multiplier',
      token_description: '2x Score',
      rarity: 'rare',
      base_contracts: 1,
      quick_sell_value: 100,
      special_attributes: {},
      created_at: '2024-01-01',
    },
    in_lineup: false,
  };

  it('initializes with default state', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.cards).toEqual([]);
    expect(result.current.lineup).toEqual({
      PG: null,
      SG: null,
      SF: null,
      PF: null,
      C: null,
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.coins).toBe(1000);
  });

  it('filters player cards correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setCards([mockPlayerCard, mockTokenCard]);
    });

    expect(result.current.playerCards).toHaveLength(1);
    expect(result.current.playerCards[0]).toBe(mockPlayerCard);
  });

  it('filters token cards correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setCards([mockPlayerCard, mockTokenCard]);
    });

    expect(result.current.tokenCards).toHaveLength(1);
    expect(result.current.tokenCards[0]).toBe(mockTokenCard);
  });

  it('filters players not in lineup', () => {
    const { result } = renderHook(() => useGameState());

    const playerInLineup = { ...mockPlayerCard, in_lineup: true };
    const playerNotInLineup = { ...mockPlayerCard, id: 'player-2', in_lineup: false };

    act(() => {
      result.current.setCards([playerInLineup, playerNotInLineup, mockTokenCard]);
    });

    expect(result.current.playerCardsNotInLineup).toHaveLength(1);
    expect(result.current.playerCardsNotInLineup[0].id).toBe('player-2');
  });

  it('filters available tokens (not applied to lineup)', () => {
    const { result } = renderHook(() => useGameState());

    const appliedToken = { ...mockTokenCard, id: 'token-applied' };
    const availableToken = { ...mockTokenCard, id: 'token-available' };

    act(() => {
      result.current.setCards([appliedToken, availableToken]);
      result.current.setLineup({
        ...result.current.lineup,
        SF: { ...mockPlayerCard, applied_token_id: 'token-applied' },
      });
    });

    expect(result.current.availableTokens).toHaveLength(1);
    expect(result.current.availableTokens[0].id).toBe('token-available');
  });

  it('checks lineup completion correctly', () => {
    const { result } = renderHook(() => useGameState());

    // Initially incomplete
    expect(result.current.isLineupComplete()).toBe(false);

    // Fill all positions
    act(() => {
      result.current.setLineup({
        PG: { ...mockPlayerCard, id: 'pg', card: { ...mockPlayerCard.card, player_position: 'PG' } },
        SG: { ...mockPlayerCard, id: 'sg', card: { ...mockPlayerCard.card, player_position: 'SG' } },
        SF: { ...mockPlayerCard, id: 'sf', card: { ...mockPlayerCard.card, player_position: 'SF' } },
        PF: { ...mockPlayerCard, id: 'pf', card: { ...mockPlayerCard.card, player_position: 'PF' } },
        C: { ...mockPlayerCard, id: 'c', card: { ...mockPlayerCard.card, player_position: 'C' } },
      });
    });

    expect(result.current.isLineupComplete()).toBe(true);
  });

  it('gets applied token ID correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setLineup({
        ...result.current.lineup,
        SF: { ...mockPlayerCard, applied_token_id: 'token-123' },
      });
    });

    expect(result.current.getAppliedTokenId('player-1')).toBe('token-123');
    expect(result.current.getAppliedTokenId('non-existent')).toBeUndefined();
  });

  it('gets applied token info correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setCards([mockTokenCard]);
      result.current.setLineup({
        ...result.current.lineup,
        SF: { ...mockPlayerCard, applied_token_id: 'token-1' },
      });
    });

    const tokenInfo = result.current.getAppliedTokenInfo('player-1');
    expect(tokenInfo).toEqual({
      id: 'token-1',
      type: 'score_multiplier',
      effect: 'score_multiplier',
      description: '2x Score',
    });
  });

  it('returns correct token icons', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.getTokenIcon('contract', '')).toBe('⚡');
    expect(result.current.getTokenIcon('play', '2x')).toBe('2️⃣');
    expect(result.current.getTokenIcon('play', '1.5x')).toBe('🎯');
    expect(result.current.getTokenIcon('play', '25+')).toBe('🔥');
    expect(result.current.getTokenIcon('play', 'Risk')).toBe('🎲');
    expect(result.current.getTokenIcon('play', 'other')).toBe('✨');
  });

  it('manages drag and drop state', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setDraggedCard(mockPlayerCard);
    });
    expect(result.current.draggedCard).toBe(mockPlayerCard);

    act(() => {
      result.current.setDraggedToken(mockTokenCard);
    });
    expect(result.current.draggedToken).toBe(mockTokenCard);

    act(() => {
      result.current.setDragOverPosition('PG');
    });
    expect(result.current.dragOverPosition).toBe('PG');

    act(() => {
      result.current.setDragOverPlayer('player-1');
    });
    expect(result.current.dragOverPlayer).toBe('player-1');
  });

  it('manages pack opening state', () => {
    const { result } = renderHook(() => useGameState());

    const newPackState = {
      openingPack: true,
      revealedCards: [mockPlayerCard.card],
      showCards: true,
      currentPackType: 'bronze',
      packOpeningStage: 'revealing' as const,
    };

    act(() => {
      result.current.setPackOpeningState(newPackState);
    });

    expect(result.current.packOpeningState).toEqual(newPackState);
  });

  it('manages token modal state', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setTokenModalOpen(true);
      result.current.setSelectedPlayerForToken(mockPlayerCard);
    });

    expect(result.current.tokenModalOpen).toBe(true);
    expect(result.current.selectedPlayerForToken).toBe(mockPlayerCard);
  });
}); 
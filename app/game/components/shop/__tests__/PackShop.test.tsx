import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PackShop from '../PackShop';
import { UserCardWithCard, CurrentTeam } from '../../../types';
import { PACK_TYPES } from '@/app/lib/game/packs';

describe('PackShop', () => {
  const mockProps = {
    coins: 1000,
    cards: [] as UserCardWithCard[],
    currentTeam: {
      id: 'team-1',
      name: 'Test Team',
      hasClaimedStarter: false,
    } as CurrentTeam,
    openingPack: false,
    draggedCard: null,
    openPack: jest.fn(),
    handleQuickSellCard: jest.fn(),
    setDraggedCard: jest.fn(),
  };

  const mockCard: UserCardWithCard = {
    id: 'card-1',
    contracts_remaining: 5,
    contracts_used: 0,
    card: {
      id: 'card-1',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all pack types', () => {
    render(<PackShop {...mockProps} />);
    
    Object.values(PACK_TYPES).forEach(pack => {
      expect(screen.getByText(pack.name)).toBeInTheDocument();
    });
  });

  it('shows pack costs correctly', () => {
    render(<PackShop {...mockProps} />);
    
    // Starter pack should show FREE
    expect(screen.getByText('FREE')).toBeInTheDocument();
    
    // Other packs should show their costs
    expect(screen.getByText('🪙 500')).toBeInTheDocument(); // Bronze
    expect(screen.getByText('🪙 1k')).toBeInTheDocument(); // Silver
    expect(screen.getByText('🪙 2k')).toBeInTheDocument(); // Gold
  });

  it('shows pack contents (players and tokens)', () => {
    render(<PackShop {...mockProps} />);
    
    // Check for pack content indicators
    expect(screen.getByText('3P • 1T')).toBeInTheDocument(); // Starter
    expect(screen.getByText('2P • 1T')).toBeInTheDocument(); // Bronze
    expect(screen.getByText('3P • 2T')).toBeInTheDocument(); // Silver
    expect(screen.getByText('4P • 3T')).toBeInTheDocument(); // Gold
  });

  it('disables packs when not enough coins', () => {
    const propsWithLowCoins = {
      ...mockProps,
      coins: 100, // Not enough for any paid pack
    };
    
    render(<PackShop {...propsWithLowCoins} />);
    
    // Bronze, Silver, and Gold should be disabled
    const bronzeButton = screen.getByText('Bronze Pack').closest('button');
    const silverButton = screen.getByText('Silver Pack').closest('button');
    const goldButton = screen.getByText('Gold Pack').closest('button');
    
    expect(bronzeButton).toBeDisabled();
    expect(silverButton).toBeDisabled();
    expect(goldButton).toBeDisabled();
    
    // Starter should still be enabled
    const starterButton = screen.getByText('Starter Pack').closest('button');
    expect(starterButton).not.toBeDisabled();
  });

  it('disables starter pack when already claimed', () => {
    const propsWithClaimedStarter = {
      ...mockProps,
      currentTeam: {
        ...mockProps.currentTeam,
        hasClaimedStarter: true,
      },
    };
    
    render(<PackShop {...propsWithClaimedStarter} />);
    
    const starterButton = screen.getByText('Starter Pack').closest('button');
    expect(starterButton).toBeDisabled();
    expect(screen.getByText('✓ Claimed')).toBeInTheDocument();
  });

  it('disables all packs when opening pack', () => {
    const propsWithOpeningPack = {
      ...mockProps,
      openingPack: true,
    };
    
    render(<PackShop {...propsWithOpeningPack} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      if (button.textContent?.includes('Pack')) {
        expect(button).toBeDisabled();
      }
    });
  });

  it('shows warning when card limit would be exceeded', () => {
    const propsWithManyCards = {
      ...mockProps,
      cards: Array(10).fill(mockCard), // 10 cards, so any pack would exceed 13 limit
    };
    
    render(<PackShop {...propsWithManyCards} />);
    
    // All pack buttons should be disabled
    const packButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Pack')
    );
    
    packButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
    
    // Should show "Full" warning
    expect(screen.getAllByText('⚠️ Full')).toHaveLength(4);
  });

  it('calls openPack when pack is clicked', () => {
    render(<PackShop {...mockProps} />);
    
    const bronzeButton = screen.getByText('Bronze Pack').closest('button');
    fireEvent.click(bronzeButton!);
    
    expect(mockProps.openPack).toHaveBeenCalledWith('bronze');
  });

  it('renders sell zone', () => {
    render(<PackShop {...mockProps} />);
    
    expect(screen.getByText('🗑️')).toBeInTheDocument();
    expect(screen.getByText('Sell Zone')).toBeInTheDocument();
    expect(screen.getByText('Drag cards here')).toBeInTheDocument();
  });

  it('highlights sell zone when dragging card', () => {
    const propsWithDraggedCard = {
      ...mockProps,
      draggedCard: mockCard,
    };
    
    render(<PackShop {...propsWithDraggedCard} />);
    
    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('Drop to Sell')).toBeInTheDocument();
    expect(screen.getByText('Get 500 coins')).toBeInTheDocument();
  });

  it('handles card drop on sell zone', () => {
    const propsWithDraggedCard = {
      ...mockProps,
      draggedCard: mockCard,
    };
    
    render(<PackShop {...propsWithDraggedCard} />);
    
    const sellZone = screen.getByText('Drop to Sell').closest('div')?.parentElement;
    
    fireEvent.dragOver(sellZone!);
    fireEvent.drop(sellZone!);
    
    expect(mockProps.handleQuickSellCard).toHaveBeenCalledWith(
      'card-1',
      500,
      'LeBron James'
    );
    expect(mockProps.setDraggedCard).toHaveBeenCalledWith(null);
  });

  it('does not sell cards that are in lineup', () => {
    const cardInLineup = {
      ...mockCard,
      in_lineup: true,
    };
    
    const propsWithLineupCard = {
      ...mockProps,
      draggedCard: cardInLineup,
    };
    
    render(<PackShop {...propsWithLineupCard} />);
    
    const sellZone = screen.getByText('Sell Zone').closest('div')?.parentElement;
    
    fireEvent.dragOver(sellZone!);
    fireEvent.drop(sellZone!);
    
    expect(mockProps.handleQuickSellCard).not.toHaveBeenCalled();
  });

  it('shows correct pack icons', () => {
    render(<PackShop {...mockProps} />);
    
    expect(screen.getByText('🎁')).toBeInTheDocument(); // Starter
    expect(screen.getByText('📦')).toBeInTheDocument(); // Bronze
    expect(screen.getByText('💎')).toBeInTheDocument(); // Silver
    expect(screen.getByText('👑')).toBeInTheDocument(); // Gold
  });

  it('applies hover effects to available packs', () => {
    render(<PackShop {...mockProps} />);
    
    const bronzeButton = screen.getByText('Bronze Pack').closest('button');
    
    expect(bronzeButton).toHaveClass(
      'hover:border-amber-400/70',
      'hover:scale-105',
      'hover:shadow-xl'
    );
  });
}); 
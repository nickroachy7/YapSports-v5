import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineupSection from '../LineupSection';
import { UserCardWithCard, Lineup } from '../../../types';

// Mock the Card component
jest.mock('@/app/components/game/Card', () => {
  return function MockCard({ card, userCard }: any) {
    return (
      <div data-testid={`card-${card.id}`}>
        <div>{card.player_name}</div>
        <div>Contracts: {userCard.contracts_remaining}</div>
      </div>
    );
  };
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LineupSection', () => {
  const mockProps = {
    lineup: {
      PG: null,
      SG: null,
      SF: null,
      PF: null,
      C: null,
    } as Lineup,
    isLineupComplete: jest.fn(() => false),
    handleSubmitLineup: jest.fn(),
    dragOverPosition: null,
    dragOverPlayer: null,
    draggedToken: null,
    handleDragOver: jest.fn(),
    handleDragLeave: jest.fn(),
    handleDrop: jest.fn(),
    handlePlayerDragOver: jest.fn(),
    handlePlayerDragLeave: jest.fn(),
    handleTokenDropOnPlayer: jest.fn(),
    getAppliedTokenId: jest.fn(),
    getAppliedTokenInfo: jest.fn(),
    getTokenIcon: jest.fn(() => '✨'),
    handleApplyToken: jest.fn(),
    openTokenModal: jest.fn(),
    removeFromLineup: jest.fn(),
    handleQuickSellLineupCard: jest.fn(),
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
    in_lineup: true,
    lineup_position: 'SF',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all five lineup positions', () => {
    render(<LineupSection {...mockProps} />);
    
    expect(screen.getByText('PG')).toBeInTheDocument();
    expect(screen.getByText('SG')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('PF')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('shows empty state for positions without players', () => {
    render(<LineupSection {...mockProps} />);
    
    expect(screen.getAllByText(/Drop.*here/)).toHaveLength(5);
    expect(screen.getByText(/Drop Guard here/)).toBeInTheDocument();
    expect(screen.getByText(/Drop Forward here/)).toBeInTheDocument();
    expect(screen.getByText(/Drop Center here/)).toBeInTheDocument();
  });

  it('displays lineup completion status', () => {
    render(<LineupSection {...mockProps} />);
    
    expect(screen.getByText('Lineup: 0/5')).toBeInTheDocument();
  });

  it('disables submit button when lineup is incomplete', () => {
    render(<LineupSection {...mockProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit Lineup/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveClass('cursor-not-allowed');
  });

  it('enables submit button when lineup is complete', () => {
    const completeProps = {
      ...mockProps,
      isLineupComplete: jest.fn(() => true),
    };
    
    render(<LineupSection {...completeProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit Lineup/i });
    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveClass('cursor-pointer');
  });

  it('renders player card when position is filled', () => {
    const propsWithPlayer = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
    };
    
    render(<LineupSection {...propsWithPlayer} />);
    
    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('Contracts: 5')).toBeInTheDocument();
  });

  it('shows token indicator when token is applied', () => {
    const propsWithToken = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
      getAppliedTokenId: jest.fn(() => 'token-1'),
      getAppliedTokenInfo: jest.fn(() => ({
        id: 'token-1',
        type: 'play',
        description: '2x Score Multiplier',
      })),
    };
    
    render(<LineupSection {...propsWithToken} />);
    
    expect(screen.getByText('🎮 PLAY TOKEN')).toBeInTheDocument();
    expect(screen.getByText('2x Score Multiplier')).toBeInTheDocument();
  });

  it('handles drag over event', () => {
    render(<LineupSection {...mockProps} />);
    
    const pgSlot = screen.getByText('PG').parentElement?.querySelector('[onDragOver]');
    fireEvent.dragOver(pgSlot!);
    
    expect(mockProps.handleDragOver).toHaveBeenCalledWith(expect.any(Object), 'PG');
  });

  it('handles drop event', () => {
    render(<LineupSection {...mockProps} />);
    
    const pgSlot = screen.getByText('PG').parentElement?.querySelector('[onDrop]');
    fireEvent.drop(pgSlot!);
    
    expect(mockProps.handleDrop).toHaveBeenCalledWith(expect.any(Object), 'PG');
  });

  it('shows action buttons on hover', async () => {
    const propsWithPlayer = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
    };
    
    render(<LineupSection {...propsWithPlayer} />);
    
    const playerCard = screen.getByTestId('card-card-1').parentElement;
    fireEvent.mouseEnter(playerCard!);
    
    // Check if action buttons are visible
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeInTheDocument();
  });

  it('calls removeFromLineup when remove button is clicked', async () => {
    const propsWithPlayer = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
    };
    
    render(<LineupSection {...propsWithPlayer} />);
    
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    
    expect(mockProps.removeFromLineup).toHaveBeenCalledWith('SF');
  });

  it('calls openTokenModal when apply token button is clicked', async () => {
    const propsWithPlayer = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
    };
    
    render(<LineupSection {...propsWithPlayer} />);
    
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);
    
    expect(mockProps.openTokenModal).toHaveBeenCalledWith(mockCard);
  });

  it('calls handleQuickSellLineupCard when sell button is clicked', async () => {
    const propsWithPlayer = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
    };
    
    render(<LineupSection {...propsWithPlayer} />);
    
    const sellButton = screen.getByText('Sell');
    fireEvent.click(sellButton);
    
    expect(mockProps.handleQuickSellLineupCard).toHaveBeenCalledWith(mockCard, 'SF');
  });

  it('highlights position when dragging over', () => {
    const propsWithDragOver = {
      ...mockProps,
      dragOverPosition: 'PG',
    };
    
    render(<LineupSection {...propsWithDragOver} />);
    
    const pgSlot = screen.getByText('PG').parentElement?.querySelector('[onDragOver]');
    expect(pgSlot).toHaveClass('border-blue-400', 'bg-blue-400/20', 'scale-105');
  });

  it('shows token drop indicator when dragging token over player', () => {
    const mockToken: UserCardWithCard = {
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

    const propsWithDraggedToken = {
      ...mockProps,
      lineup: {
        ...mockProps.lineup,
        SF: mockCard,
      },
      draggedToken: mockToken,
      dragOverPlayer: 'card-1',
    };
    
    render(<LineupSection {...propsWithDraggedToken} />);
    
    expect(screen.getByText('Drop to Apply Token')).toBeInTheDocument();
  });
}); 
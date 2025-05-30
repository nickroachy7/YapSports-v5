"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useCoins } from '@/app/context/CoinsContext';
import Header from '../components/Header';

import GameCarousel from '../components/GameCarousel';
import Card from '@/app/components/game/Card';
import TokenCard from '@/app/components/game/TokenCard';
import TokenSelectionModal from '@/app/components/game/TokenSelectionModal';
import { Card as CardType } from '@/app/lib/supabase';
import { PACK_TYPES } from '@/app/lib/game/packs';
import { RARITIES } from '@/app/lib/constants/rarities';
import { DebugPanel } from '@/app/lib/debug-tools';
import React from 'react';
import { toast } from 'react-hot-toast';

interface UserCardWithCard {
  id: string;
  contracts_remaining: number;
  contracts_used: number;
  card: CardType;
  in_lineup: boolean;
  lineup_position?: string;
  applied_token_id?: string;
}

interface Lineup {
  PG: UserCardWithCard | null;
  SG: UserCardWithCard | null;
  SF: UserCardWithCard | null;
  PF: UserCardWithCard | null;
  C: UserCardWithCard | null;
}

// Loading skeleton component
const CardSkeleton = () => (
  <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
    <div className="h-48 bg-gray-700 rounded mb-4"></div>
    <div className="h-4 bg-gray-700 rounded mb-2"></div>
    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
  </div>
);

const TokenSkeleton = () => (
  <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse"></div>
);

export default function GamePage() {
  const [activeTab, setActiveTab] = useState<'game'>('game');
  const [cards, setCards] = useState<UserCardWithCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [currentTeam, setCurrentTeam] = useState<{id: string, name: string, hasClaimedStarter?: boolean} | null>(null);
  const { coins, setCoins, refreshCoins, updateCoins } = useCoins();
  const [loading, setLoading] = useState(true);
  const [hasStarterPack, setHasStarterPack] = useState(false);
  
  // Enhanced pack opening states
  const [openingPack, setOpeningPack] = useState(false);
  const [revealedCards, setRevealedCards] = useState<CardType[]>([]);
  const [showCards, setShowCards] = useState(false);
  const [currentPackType, setCurrentPackType] = useState<string>('');
  const [packOpeningStage, setPackOpeningStage] = useState<'closed' | 'opening' | 'revealing' | 'complete'>('closed');
  
  // Lineup states
  const [lineup, setLineup] = useState<Lineup>({
    PG: null,
    SG: null,
    SF: null,
    PF: null,
    C: null
  });
  
  // Drag and drop states
  const [draggedCard, setDraggedCard] = useState<UserCardWithCard | null>(null);
  const [draggedToken, setDraggedToken] = useState<UserCardWithCard | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);
  
  // Token system states
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [selectedPlayerForToken, setSelectedPlayerForToken] = useState<UserCardWithCard | null>(null);
  
  // Contest states
  const [activeContest, setActiveContest] = useState<any>(null);
  const [isEnteringContest, setIsEnteringContest] = useState(false);
  const [hasEnteredContest, setHasEnteredContest] = useState(false);

  // Scoring states
  const [scoringData, setScoringData] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [todaysGames, setTodaysGames] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  // Get team from URL parameters
  useEffect(() => {
    const fetchTeamData = async () => {
      const teamId = searchParams.get('team');
      if (teamId) {
        try {
          // Try to fetch team from API
          const response = await fetch(`/api/teams/${teamId}`);
          const data = await response.json();

          if (data.success && data.team) {
            setCurrentTeam({
              id: data.team.id,
              name: data.team.name,
              hasClaimedStarter: data.team.has_claimed_starter
            });
            setHasStarterPack(data.team.has_claimed_starter || false);
          } else {
            // Fallback to mock data
            const mockTeams = {
              '1': { id: '1', name: 'Championship Squad', hasClaimedStarter: true },
              '2': { id: '2', name: 'Rookie Experiment', hasClaimedStarter: false },
              '3': { id: '3', name: 'High Risk High Reward', hasClaimedStarter: true }
            };
            const team = mockTeams[teamId as keyof typeof mockTeams];
            if (team) {
              setCurrentTeam(team);
              setHasStarterPack(team.hasClaimedStarter || false);
            } else {
              // Team not found, redirect to teams page
              router.push('/teams');
            }
          }
        } catch (error) {
          console.error('Error fetching team:', error);
          // Fallback to mock data
          const mockTeams = {
            '1': { id: '1', name: 'Championship Squad', hasClaimedStarter: true },
            '2': { id: '2', name: 'Rookie Experiment', hasClaimedStarter: false },
            '3': { id: '3', name: 'High Risk High Reward', hasClaimedStarter: true }
          };
          const team = mockTeams[teamId as keyof typeof mockTeams];
          if (team) {
            setCurrentTeam(team);
            setHasStarterPack(team.hasClaimedStarter || false);
          } else {
            router.push('/teams');
          }
        }
      } else {
        // No team selected, redirect to teams page
        router.push('/teams');
      }
    };

    fetchTeamData();
  }, [searchParams, router]);

  // Computed values
  const playerCards = useMemo(() => 
    cards.filter(card => card.card.card_type === 'player'),
    [cards]
  );
  
  const tokenCards = useMemo(() => 
    cards.filter(card => card.card.card_type === 'token'),
    [cards]
  );
  
  const playerCardsNotInLineup = useMemo(() => 
    playerCards.filter(card => !card.in_lineup),
    [playerCards]
  );
  
  const availableTokens = useMemo(() => {
    return tokenCards.filter(card => {
      // Don't show tokens that are applied to any lineup player
      const isAppliedToLineup = Object.values(lineup).some(lineupCard => 
        lineupCard?.applied_token_id === card.id
      );
      return !isAppliedToLineup;
    });
  }, [tokenCards, lineup]);

  // Refresh inventory when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentTeam && auth.user) {
        console.log('Page became visible, refreshing inventory...');
        fetchInventory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTeam, auth.user]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push('/auth/signin');
    }
  }, [auth.isLoading, auth.user, router]);

  // Initial load
  useEffect(() => {
    const loadGameData = async () => {
      if (!auth.user || auth.isLoading || !currentTeam) return;
      
      setLoading(true);
      try {
        await Promise.all([
          fetchUserData(),
          fetchInventory(),
          fetchActiveContest()
        ]);
      } catch (error) {
        console.error('Error loading game data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [auth.user, auth.isLoading, currentTeam]);

  const fetchUserData = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/auth/create-user?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        setCoins(data.user.coins);
      } else {
        setCoins(1000);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setCoins(1000);
    }
  };

  const fetchInventory = async () => {
    if (!currentTeam) {
      console.log('No current team, skipping inventory fetch');
      return;
    }

    try {
      const teamId = currentTeam.id;
      const url = `/api/cards/inventory?team=${teamId}`;
      
      console.log(`Fetching inventory for team ${teamId}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        console.log(`Loaded ${data.cards.length} cards for team ${teamId}`);
        setCards(data.cards);
        
        // Build lineup from inventory data
        const newLineup: Lineup = {
          PG: null,
          SG: null,
          SF: null,
          PF: null,
          C: null
        };
        
        data.cards.forEach((card: UserCardWithCard) => {
          if (card.in_lineup && card.lineup_position) {
            newLineup[card.lineup_position as keyof Lineup] = card;
          }
        });
        
        setLineup(newLineup);
      } else {
        console.error('Failed to fetch inventory:', data.error);
        // Don't show error toast on page load, just log it
        console.log('Using empty inventory as fallback');
        setCards([]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      console.log('Using empty inventory as fallback');
      setCards([]);
    }
  };

  const fetchActiveContest = async () => {
    try {
      const response = await fetch('/api/contests/active');
      const data = await response.json();
      if (data.success && data.contest) {
        setActiveContest(data.contest);
        
        const entryResponse = await fetch(`/api/contests/check-entry?contestId=${data.contest.id}`);
        const entryData = await entryResponse.json();
        setHasEnteredContest(entryData.hasEntry);
      }
    } catch (error) {
      console.error('Failed to fetch active contest:', error);
    }
  };

  const openPack = async (packId: string) => {
    if (openingPack) return;
    
    const pack = PACK_TYPES[packId];
    if (!pack) return;
    
    // Check if this is a starter pack and if team has already claimed it
    if (packId === 'starter' && currentTeam?.hasClaimedStarter) {
      toast.error('This team has already claimed its starter pack!');
      return;
    }
    
    if (pack.cost > coins && packId !== 'starter') {
      toast.error('Not enough coins!');
      return;
    }
    
    setOpeningPack(true);
    setRevealedCards([]);
    setShowCards(false);
    setCurrentPackType(packId);
    setPackOpeningStage('opening');
    
    try {
      const response = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          packType: packId,
          teamId: currentTeam?.id // Include team ID for team-specific packs
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Pack opening error:', data);
        
        if (data.error.includes('Starter pack already claimed')) {
          toast.error('This team has already claimed its starter pack!');
        } else if (data.error.includes('exceed 13-card limit')) {
          toast.error(`${data.error}\n\nTip: Sell some cards in your inventory to make room for new ones!`);
        } else if (data.error.includes('Insufficient coins')) {
          toast.error('Not enough coins to open this pack!');
        } else {
          toast.error(`Failed to open pack: ${data.error}`);
        }
        
        setPackOpeningStage('closed');
        return;
      }
      
      if (pack.cost > 0) {
        setCoins(coins - pack.cost);
      }
      
      if (packId === 'starter' && currentTeam) {
        setHasStarterPack(true);
        setCurrentTeam({ ...currentTeam, hasClaimedStarter: true });
      }
      
      setRevealedCards(data.cards || []);
      setPackOpeningStage('revealing');
      
      setTimeout(() => {
        setShowCards(true);
        setPackOpeningStage('complete');
      }, 1000);
      
      setTimeout(() => {
        setPackOpeningStage('closed');
        setRevealedCards([]);
        setShowCards(false);
      }, 8000);
      
      await fetchInventory();
      await refreshCoins();
      
    } catch (error) {
      console.error('Failed to open pack:', error);
      toast.error('Failed to open pack');
      setPackOpeningStage('closed');
    } finally {
      setOpeningPack(false);
    }
  };

  const handleQuickSell = async () => {
    if (selectedCards.size === 0) return;
    
    const selectedCardsList = Array.from(selectedCards);
    const totalValue = selectedCardsList.reduce((sum, cardId) => {
      const card = cards.find(c => c.id === cardId);
      return sum + (card?.card.quick_sell_value || 0);
    }, 0);
    
    if (!confirm(`Sell ${selectedCards.size} cards for ${totalValue} coins?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/cards/quick-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: selectedCardsList })
      });
      
      if (response.ok) {
        setCards(cards.filter(c => !selectedCards.has(c.id)));
        setSelectedCards(new Set());
        setCoins(coins + totalValue);
        toast.success(`Sold ${selectedCardsList.length} cards for ${totalValue} coins!`);
        await refreshCoins();
      }
    } catch (error) {
      console.error('Failed to sell cards:', error);
      toast.error('Failed to sell cards');
    }
  };

  const handleCardSelect = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, card: UserCardWithCard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, position: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, position: string) => {
    e.preventDefault();
    setDragOverPosition(null);
    
    if (!draggedCard) return;
    
    const validPositions: Record<string, string[]> = {
      'PG': ['PG', 'SG'],
      'SG': ['PG', 'SG'], 
      'SF': ['SF', 'PF'],
      'PF': ['SF', 'PF'],
      'C': ['C']
    };
    
    if (!validPositions[position]?.includes(draggedCard.card.player_position || '')) {
      toast.error(`Cannot place ${draggedCard.card.player_position} in ${position} position`);
      setDraggedCard(null);
      return;
    }
    
    if (draggedCard.contracts_remaining <= 0) {
      toast.error('This card has no contracts remaining');
      setDraggedCard(null);
      return;
    }
    
    try {
      const response = await fetch('/api/cards/update-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardId: draggedCard.id, 
          position: position,
          inLineup: true 
        })
      });
      
      if (response.ok) {
        const currentCardInPosition = lineup[position as keyof Lineup];
        if (currentCardInPosition) {
          await fetch('/api/cards/update-lineup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              cardId: currentCardInPosition.id, 
              position: null,
              inLineup: false 
            })
          });
        }
        
        Object.entries(lineup).forEach(async ([pos, card]) => {
          if (card?.id === draggedCard.id && pos !== position) {
            await fetch('/api/cards/update-lineup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                cardId: card.id, 
                position: null,
                inLineup: false 
              })
            });
          }
        });
        
        const newLineup = { ...lineup };
        newLineup[position as keyof Lineup] = { ...draggedCard, in_lineup: true, lineup_position: position };
        setLineup(newLineup);
        
        await fetchInventory();
        toast.success(`${draggedCard.card.player_name} added to ${position}`);
      }
    } catch (error) {
      console.error('Failed to update lineup:', error);
      toast.error('Failed to update lineup');
    }
    
    setDraggedCard(null);
  };

  const removeFromLineup = async (position: string) => {
    const card = lineup[position as keyof Lineup];
    if (!card) return;
    
    try {
      if (card.applied_token_id) {
        await fetch('/api/lineup/apply-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerCardId: card.id, 
            tokenCardId: null
          })
        });
      }

      const response = await fetch('/api/cards/update-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardId: card.id, 
          position: null,
          inLineup: false 
        })
      });
      
      if (response.ok) {
        const newLineup = { ...lineup };
        newLineup[position as keyof Lineup] = null;
        setLineup(newLineup);
        await fetchInventory();
        toast.success(`${card.card.player_name} removed from lineup`);
      }
    } catch (error) {
      console.error('Failed to remove from lineup:', error);
      toast.error('Failed to remove from lineup');
    }
  };

  // Token drag handlers
  const handleTokenDragStart = (e: React.DragEvent, tokenCard: UserCardWithCard) => {
    setDraggedToken(tokenCard);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePlayerDragOver = (e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    if (draggedToken) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverPlayer(playerId);
    }
  };

  const handlePlayerDragLeave = () => {
    setDragOverPlayer(null);
  };

  const handleTokenDropOnPlayer = async (e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    setDragOverPlayer(null);
    
    if (!draggedToken) return;
    
    // Check if token is already applied to prevent double application
    if (draggedToken.applied_token_id) {
      toast.error('This token is already applied to another player!');
      setDraggedToken(null);
      return;
    }
    
    // Check if player already has a token applied
    const playerCard = Object.values(lineup).find(card => card?.id === playerId);
    if (playerCard?.applied_token_id) {
      toast.error('This player already has a token applied! Remove the current token first.');
      setDraggedToken(null);
      return;
    }
    
    try {
      // Immediately update local state for instant feedback
      const tokenToApply = draggedToken;
      setDraggedToken(null);
      
      // Update lineup state immediately - show token on player
      const newLineup = { ...lineup };
      Object.entries(newLineup).forEach(([position, card]) => {
        if (card?.id === playerId) {
          newLineup[position as keyof Lineup] = {
            ...card,
            applied_token_id: tokenToApply.id
          };
        }
      });
      setLineup(newLineup);
      
      // Show immediate feedback
      toast.success(`Token applied to ${playerCard?.card.player_name || 'player'}!`);
      
      // Then make the API call in the background
      await handleApplyToken(playerId, tokenToApply.id);
    } catch (error) {
      console.error('Failed to apply token:', error);
      toast.error('Failed to apply token. Please try again.');
      // Revert the optimistic update on error
      await fetchInventory();
      setDraggedToken(null);
    }
  };

  const isLineupComplete = () => {
    return Object.values(lineup).every(card => card !== null);
  };

  const validateLineupContracts = () => {
    const expiredCards = Object.values(lineup).filter(card => 
      card !== null && card.contracts_remaining <= 0
    );
    
    const lowContractCards = Object.values(lineup).filter(card => 
      card !== null && card.contracts_remaining > 0 && card.contracts_remaining <= 2
    );
    
    return {
      hasExpiredCards: expiredCards.length > 0,
      hasLowContractCards: lowContractCards.length > 0,
      expiredCards: expiredCards as UserCardWithCard[],
      lowContractCards: lowContractCards as UserCardWithCard[],
      isValid: expiredCards.length === 0
    };
  };

  const handleSubmitLineup = async () => {
    if (!isLineupComplete()) {
      toast.error('Please complete your lineup first! You need all 5 positions filled (PG, SG, SF, PF, C).');
      return;
    }

    const contractValidation = validateLineupContracts();
    
    if (!contractValidation.isValid) {
      const expiredNames = contractValidation.expiredCards.map(card => card.card.player_name).join(', ');
      toast.error(`Cannot submit lineup! The following players have expired contracts: ${expiredNames}`);
      return;
    }
    
    if (contractValidation.hasLowContractCards) {
      const lowContractNames = contractValidation.lowContractCards.map(card => 
        `${card.card.player_name} (${card.contracts_remaining} remaining)`
      ).join(', ');
      
      const confirmed = confirm(`Warning: Some players have low contracts remaining: ${lowContractNames}\n\nDo you want to submit this lineup anyway?`);
      if (!confirmed) return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const lineupIds = {
        PG: lineup.PG?.id,
        SG: lineup.SG?.id, 
        SF: lineup.SF?.id,
        PF: lineup.PF?.id,
        C: lineup.C?.id
      };
      
      const response = await fetch('/api/lineup/submit-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineup: lineupIds,
          gameDate: today
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ ${data.message}\n\nYou are now competing in today's daily leaderboard!`);
        await fetchInventory();
      } else {
        toast.error(`❌ ${data.error || 'Failed to submit lineup'}`);
      }
    } catch (error) {
      console.error('Failed to submit lineup:', error);
      toast.error('❌ Failed to submit lineup. Please try again.');
    }
  };

  // Scoring functions
  const calculateTodaysScore = async () => {
    if (!isLineupComplete()) {
      toast.error('Please complete your lineup first!');
      return;
    }

    setLoadingScore(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/lineup/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameDate: today })
      });

      const data = await response.json();
      if (data.success) {
        setScoringData(data);
        toast.success(`Your lineup scored ${data.totalScore} points!`);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to calculate score:', error);
      toast.error('Failed to calculate score');
    } finally {
      setLoadingScore(false);
    }
  };

  const fetchTodaysGames = async () => {
    try {
      const response = await fetch('/api/games/today');
      const data = await response.json();
      if (data.success) {
        setTodaysGames(data.games);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/leaderboard?date=${today}`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };



  // Token management functions
  const getAppliedTokenId = (playerCardId: string): string | undefined => {
    const lineupCard = Object.values(lineup).find(card => card?.id === playerCardId);
    return lineupCard?.applied_token_id;
  };

  const getAppliedTokenInfo = (playerCardId: string) => {
    const lineupCard = Object.values(lineup).find(card => card?.id === playerCardId);
    const appliedTokenId = lineupCard?.applied_token_id;
    
    if (!appliedTokenId) return null;
    
    const tokenCard = cards.find(card => card.id === appliedTokenId);
    if (!tokenCard) return null;
    
    return {
      id: appliedTokenId,
      type: tokenCard.card.token_type,
      effect: tokenCard.card.special_attributes?.effect,
      description: tokenCard.card.special_attributes?.description || tokenCard.card.token_description
    };
  };

  const getTokenIcon = (tokenType: string, effect: string) => {
    if (tokenType === 'contract') return '⚡';
    if (tokenType === 'play') {
      if (effect === 'stat_threshold_bonus' || effect === 'fantasy_threshold_bonus') return '🎯';
      if (effect === 'double_stats') return '⭐';
      if (effect === 'score_multiplier') return '🔥';
      return '🎮';
    }
    return '✨';
  };

  const openTokenModal = (player: UserCardWithCard) => {
    setSelectedPlayerForToken(player);
    setTokenModalOpen(true);
  };

  const closeTokenModal = () => {
    setTokenModalOpen(false);
    setSelectedPlayerForToken(null);
  };

  const handleApplyToken = async (playerCardId: string, tokenCardId: string) => {
    try {
      // Optimistically update the lineup immediately
      const newLineup = { ...lineup };
      Object.entries(newLineup).forEach(([position, card]) => {
        if (card?.id === playerCardId) {
          newLineup[position as keyof Lineup] = {
            ...card,
            applied_token_id: tokenCardId || undefined
          };
        }
      });
      setLineup(newLineup);

      const response = await fetch('/api/lineup/apply-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerCardId, 
          tokenCardId: tokenCardId || null 
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to apply token');
      }

      // Refresh inventory to get updated state
      await fetchInventory();
      
      // Close the modal
      setTokenModalOpen(false);
      setSelectedPlayerForToken(null);
      
      if (tokenCardId) {
        toast.success('Token applied successfully!');
      } else {
        toast.success('Token removed successfully!');
      }
      
      return data;
    } catch (error) {
      console.error('Error applying token:', error);
      toast.error('Failed to apply token. Please try again.');
      // Revert optimistic update on error
      await fetchInventory();
      throw error;
    }
  };

  const handleQuickSellCard = async (cardId: string, sellValue: number, playerName?: string) => {
    const cardName = playerName || 'this card';
    
    const confirmed = confirm(
      `Are you sure you want to sell ${cardName}?\n\n` +
      `You will receive: ${sellValue} coins\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch('/api/cards/quick-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId] })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to sell card');
      }

      updateCoins(sellValue);
      await fetchInventory();
      toast.success(`Successfully sold ${cardName} for ${sellValue} coins!`);
    } catch (error) {
      console.error('Error selling card:', error);
      toast.error('Failed to sell card. Please try again.');
    }
  };

  const handleQuickSellLineupCard = async (card: UserCardWithCard, position: string) => {
    const sellValue = card.card.quick_sell_value || 0;
    const playerName = card.card.player_name || 'Unknown Player';
    
    const confirmed = confirm(
      `Are you sure you want to sell ${playerName}?\n\n` +
      `You will receive: ${sellValue} coins\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch('/api/cards/quick-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [card.id] })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to sell card');
      }

      updateCoins(sellValue);
      await removeFromLineup(position);
      await fetchInventory();
      toast.success(`Successfully sold ${playerName} for ${sellValue} coins!`);
    } catch (error) {
      console.error('Error selling card:', error);
      toast.error('Failed to sell card. Please try again.');
    }
  };

  if (loading || auth.isLoading || !currentTeam) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-charcoal-900">
        <div className="text-center">
          <div className="text-2xl text-gray-400 mb-4">
            {!currentTeam ? 'Loading team...' : 'Loading game...'}
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </main>
    );
  }

  if (!auth.user) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <GameCarousel />
      <Header />
      
      {/* Team Header with Back Button */}
      {currentTeam && (
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between bg-charcoal-800/60 backdrop-blur-sm rounded-xl p-4 border border-charcoal-700/50">
            <div className="flex items-center">
          <button
                onClick={() => router.push('/teams')}
                className="mr-4 p-2 bg-charcoal-700/50 text-grey-300 rounded-lg hover:bg-charcoal-600 hover:text-white transition-colors"
                title="Back to Teams"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
          </button>
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mr-3">
                <span className="text-xl">🏀</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{currentTeam.name}</h2>
                <p className="text-sm text-grey-400">
                  Active Team • {currentTeam.hasClaimedStarter ? 'Starter Pack Claimed' : 'Starter Pack Available'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-grey-400">
                Cards: {cards.length}/13
              </div>
          <button
                onClick={() => router.push('/teams')}
                className="px-4 py-2 bg-charcoal-700/50 text-grey-300 rounded-lg hover:bg-charcoal-600 hover:text-white transition-colors text-sm"
              >
                Switch Team
          </button>
            </div>
          </div>
        </div>
      )}
      


      {/* Main Game Content */}
      <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="space-y-8">
          {/* Starting Lineup */}
            <div className="bg-charcoal-700/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Starting Lineup</h2>
                <div className="flex gap-4 items-center">
                  <div className={`px-4 py-2 rounded-lg font-bold backdrop-blur-sm ${
                    isLineupComplete() 
                      ? 'bg-green-600/90 text-white' 
                      : 'bg-charcoal-800/80 text-grey-400'
                  }`}>
                    Lineup: {Object.values(lineup).filter(card => card !== null).length}/5
                  </div>
                  <button
                    onClick={handleSubmitLineup}
                    disabled={!isLineupComplete()}
                    className={`px-6 py-3 rounded-lg font-bold transition-all backdrop-blur-sm ${
                      isLineupComplete()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg'
                        : 'bg-charcoal-800/80 text-grey-500 cursor-not-allowed'
                    }`}
                  >
                    Submit Lineup
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(lineup).map(([position, card]) => (
                  <div key={position} className="flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-2 text-white">{position}</h3>
                    <div 
                      className={`w-48 h-72 border-2 border-dashed rounded-xl flex items-center justify-center transition-all backdrop-blur-sm ${
                        dragOverPosition === position 
                          ? 'border-blue-400 bg-blue-400/20 scale-105' 
                          : card 
                            ? 'border-green-500 bg-charcoal-800/40' 
                            : 'border-charcoal-600 bg-charcoal-800/40'
                      }`}
                      onDragOver={(e) => handleDragOver(e, position)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, position)}
                    >
                      {card ? (
                        <div 
                          className={`relative group w-full h-full transition-all ${
                            dragOverPlayer === card.id ? 'ring-4 ring-purple-500 ring-opacity-50 scale-105' : ''
                          }`}
                          onDragOver={(e) => handlePlayerDragOver(e, card.id)}
                          onDragLeave={handlePlayerDragLeave}
                          onDrop={(e) => handleTokenDropOnPlayer(e, card.id)}
                        >
                          {/* Token Drop Indicator */}
                          {draggedToken && dragOverPlayer === card.id && (
                            <div className="absolute inset-0 bg-purple-500/20 border-2 border-purple-500 border-dashed rounded-xl flex items-center justify-center z-40">
                              <div className="bg-purple-600 text-white px-3 py-2 rounded-lg font-bold text-sm">
                                Drop to Apply Token
                              </div>
                            </div>
                          )}
                          
                          {/* Token Indicators */}
                          {getAppliedTokenId(card.id) && (() => {
                            const tokenInfo = getAppliedTokenInfo(card.id);
                            if (!tokenInfo) return null;
                            
                            const isContract = tokenInfo.type === 'contract';
                            
                            return (
                              <div className="absolute top-1 right-1 z-30">
                                <div className="relative group/token">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApplyToken(card.id, '');
                                    }}
                                    className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm font-bold text-white transition-all hover:scale-110 ${
                                      isContract 
                                        ? 'bg-blue-600 hover:bg-blue-500' 
                                        : 'bg-purple-600 hover:bg-purple-500'
                                    }`}
                                    title="Click to remove token"
                                  >
                                    {getTokenIcon(tokenInfo.type || 'play', tokenInfo.effect || '')}
                                  </button>
                                  
                                  <div className="absolute top-full right-0 mt-1 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl opacity-0 invisible group-hover/token:opacity-100 group-hover/token:visible transition-all duration-200 z-40 border border-gray-700">
                                    <div className="font-bold text-center mb-1">
                                      {isContract ? '⚡ CONTRACT TOKEN' : '🎮 PLAY TOKEN'}
                                    </div>
                                    <div className="text-center text-gray-300">
                                      {tokenInfo.description}
                                    </div>
                                    <div className="text-center text-gray-500 mt-1 text-xs">
                                      Click to remove
                                    </div>
                                    <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          <Card card={card.card} userCard={card} />
                          
                          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <div className="flex">
                              <button
                                onClick={() => openTokenModal(card)}
                                className="flex-1 px-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 rounded-bl-xl"
                              >
                                <span>✨</span>
                                <span className="hidden sm:inline">{getAppliedTokenId(card.id) ? 'Change' : 'Apply'}</span>
                                <span className="sm:hidden">{getAppliedTokenId(card.id) ? 'Chg' : 'Add'}</span>
                              </button>
                              <button
                                onClick={() => removeFromLineup(position)}
                                className="flex-1 px-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center"
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => handleQuickSellLineupCard(card, position)}
                                className="flex-1 px-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 rounded-br-xl"
                              >
                                <span>💰</span>
                                <span>Sell</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-gray-500 text-sm">
                            Drop {position === 'PG' || position === 'SG' ? 'Guard' : 
                                  position === 'SF' || position === 'PF' ? 'Forward' : 
                                  'Center'} here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pack Shop and Sell Zone */}
            <div className="grid grid-cols-5 gap-4">
              {/* Pack Buttons */}
              {Object.entries(PACK_TYPES).map(([packId, pack]) => {
                const canAfford = coins >= pack.cost;
                const totalCardsInPack = pack.cardCount;
                const wouldExceedLimit = cards.length + totalCardsInPack > 13;
                const isStarterPack = packId === 'starter';
                const isStarterAvailable = isStarterPack && !currentTeam?.hasClaimedStarter;
                const isAvailable = !isStarterPack || isStarterAvailable;

                return (
                  <button
                    key={packId}
                    onClick={() => openPack(packId)}
                    disabled={!isAvailable || (!canAfford && !isStarterPack) || openingPack || wouldExceedLimit}
                    className={`group relative overflow-hidden rounded-2xl p-4 h-20 transition-all duration-300 transform shadow-lg border-2 border-dashed ${
                      !isStarterAvailable ? 'bg-slate-800/60 border-slate-600/30 opacity-50 cursor-not-allowed' :
                      wouldExceedLimit ? 'bg-red-900/40 border-red-500/40 opacity-50 cursor-not-allowed' :
                      !canAfford && !isStarterPack ? 'bg-slate-800/60 border-slate-600/30 opacity-50 cursor-not-allowed' :
                      openingPack ? 'bg-slate-800/60 border-slate-600/30 opacity-50 cursor-not-allowed' :
                      packId === 'starter' ? 'bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/50 hover:border-emerald-400/70 hover:bg-gradient-to-br hover:from-emerald-500/25 hover:to-green-500/25 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30 cursor-pointer' :
                      packId === 'bronze' ? 'bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/50 hover:border-amber-400/70 hover:bg-gradient-to-br hover:from-amber-500/25 hover:to-orange-500/25 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/30 cursor-pointer' :
                      packId === 'silver' ? 'bg-gradient-to-br from-slate-400/20 to-slate-600/20 border-slate-500/50 hover:border-slate-400/70 hover:bg-gradient-to-br hover:from-slate-400/25 hover:to-slate-500/25 hover:scale-105 hover:shadow-xl hover:shadow-slate-400/30 cursor-pointer' :
                      'bg-gradient-to-br from-yellow-600/20 to-yellow-600/20 border-yellow-500/50 hover:border-yellow-400/70 hover:bg-gradient-to-br hover:from-yellow-500/25 hover:to-yellow-500/25 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/30 cursor-pointer'
                    }`}
                  >
                    {/* Shimmer effect for available packs */}
                    {isAvailable && canAfford && !openingPack && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                    
                    <div className="text-center">
                      <div className="text-3xl mb-1">
                        {packId === 'starter' ? '🎁' : 
                         packId === 'bronze' ? '📦' : 
                         packId === 'silver' ? '💎' : '👑'}
                      </div>
                      <div className="font-bold text-sm text-white mb-1">{pack.name}</div>
                      <div className="text-xs text-white/80 font-medium mb-1">
                        {pack.playerCards}P • {pack.tokenCards}T
                      </div>
                      
                      {isStarterPack && !isStarterAvailable ? (
                        <div className="text-white/70 text-xs font-medium">✓ Claimed</div>
                      ) : wouldExceedLimit ? (
                        <div className="text-red-200 text-xs font-medium">⚠️ Full</div>
                      ) : (
                        <div className="text-sm font-bold">
                          {pack.cost === 0 ? (
                            <span className="text-emerald-300 drop-shadow-lg">FREE</span>
                          ) : (
                            <span className={`drop-shadow-lg ${canAfford ? 'text-white' : 'text-red-200'}`}>
                              🪙 {pack.cost >= 1000 ? `${pack.cost/1000}k` : pack.cost}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Card Selling Zone */}
              <div 
                className={`rounded-2xl flex items-center justify-center transition-all duration-300 border-2 border-dashed shadow-lg h-20 ${
                  draggedCard && !draggedCard.in_lineup
                    ? 'bg-gradient-to-br from-yellow-400/40 to-orange-500/40 border-yellow-400 scale-105 shadow-xl shadow-yellow-500/30' 
                    : 'bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/50 hover:border-yellow-400/70 hover:bg-gradient-to-br hover:from-yellow-500/25 hover:to-orange-500/25'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (draggedCard && !draggedCard.in_lineup) {
                    const sellValue = draggedCard.card.quick_sell_value;
                    const playerName = draggedCard.card.player_name || draggedCard.card.token_type;
                    handleQuickSellCard(draggedCard.id, sellValue, playerName);
                    setDraggedCard(null);
                  }
                }}
              >
                <div className="text-center">
                  {draggedCard && !draggedCard.in_lineup ? (
                    <div className="text-yellow-100">
                      <div className="text-3xl mb-1 animate-bounce">💰</div>
                      <div className="font-bold text-sm">Drop to Sell</div>
                      <div className="text-xs text-yellow-200 font-medium">
                        Get {draggedCard.card.quick_sell_value} coins
                      </div>
                    </div>
                  ) : (
                    <div className="text-yellow-400/80">
                      <div className="text-3xl mb-1">🗑️</div>
                      <div className="font-bold text-sm">Sell Zone</div>
                      <div className="text-xs text-yellow-500/90">
                        Drag cards here
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Available Tokens - Circular Design */}
            <div className="bg-charcoal-800/60 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                Available Tokens ({availableTokens.length}{tokenCards.length > availableTokens.length ? ` of ${tokenCards.length}` : ''})
              </h3>
              <p className="text-grey-400 text-sm mb-4">
                Drag tokens onto lineup players to apply them instantly! Hover over tokens to see their effects.
                <span className="ml-2 text-blue-400">⚡ = Contract Tokens</span>
                <span className="ml-2 text-purple-400">🎮 = Play Tokens</span>
              </p>
              
              {availableTokens.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {availableTokens.map((userCard) => {
                    const isContract = userCard.card.token_type === 'contract';
                    const tokenIcon = getTokenIcon(userCard.card.token_type || 'play', userCard.card.token_description || '');
                    
                    return (
                      <div
                        key={userCard.id}
                        className="relative group"
                      >
                        {/* Circular Token Icon */}
                        <div
                          draggable
                          onDragStart={(e) => handleTokenDragStart(e, userCard)}
                          onClick={() => {
                            const tokenType = userCard.card.token_type;
                            const tokenDesc = userCard.card.token_description;
                            
                            if (tokenType === 'contract') {
                              toast(`Contract Token: ${tokenDesc}\n\nTo use: Drag this token onto a player in your lineup to add contracts.`);
                            } else if (tokenType === 'play') {
                              toast(`Play Token: ${tokenDesc}\n\nTo use: Drag this token onto a player in your lineup for the game bonus.`);
                            } else {
                              toast(`Token: ${tokenDesc}\n\nDrag this token onto a player in your lineup to apply it.`);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleQuickSellCard(
                              userCard.id, 
                              userCard.card.quick_sell_value, 
                              userCard.card.token_type
                            );
                          }}
                          className={`w-16 h-16 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white transition-all hover:scale-110 cursor-grab active:cursor-grabbing ${
                            isContract 
                              ? 'bg-blue-600 hover:bg-blue-500' 
                              : 'bg-purple-600 hover:bg-purple-500'
                          } ${draggedToken?.id === userCard.id ? 'opacity-50 scale-90' : ''}`}
                        >
                          {tokenIcon}
                        </div>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40 border border-gray-700 pointer-events-none">
                          <div className="font-bold text-center mb-2">
                            {isContract ? '⚡ CONTRACT TOKEN' : '🎮 PLAY TOKEN'}
                          </div>
                          <div className="text-center text-gray-300 mb-2">
                            <div className="font-semibold">{userCard.card.token_type?.replace('_', ' ').toUpperCase()}</div>
                            <div className="mt-1">{userCard.card.token_description}</div>
                          </div>
                          <div className="text-center text-yellow-400 text-xs">
                            Sell Value: {userCard.card.quick_sell_value} coins
                          </div>
                          <div className="text-center text-gray-500 mt-1 text-xs">
                            Drag onto player • Click for details • Right-click to sell
                          </div>
                          {/* Arrow pointer */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-charcoal-700/40 rounded-lg">
                  <p className="text-grey-400">
                    {tokenCards.length === 0 
                      ? "No token cards in inventory. Open packs to get tokens!"
                      : "No available tokens. All tokens are currently applied to lineup players."
                    }
                  </p>
                </div>
              )}
            </div>



            {/* Available Players */}
            <div className="bg-charcoal-800/60 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-4">Available Players</h3>
              <p className="text-grey-400 text-sm mb-4">
                Drag players to your lineup. Position compatibility: 
                Guards (PG/SG), Forwards (SF/PF), Centers (C only)
              </p>
              
              {playerCardsNotInLineup.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {playerCardsNotInLineup.map((userCard) => (
                    <div
                      key={userCard.id}
                      draggable={userCard.contracts_remaining > 0}
                      onDragStart={(e) => handleDragStart(e, userCard)}
                      className={`cursor-move transition-transform hover:scale-105 ${
                        userCard.contracts_remaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Card
                        card={userCard.card}
                        userCard={userCard}
                        showActions={true}
                        onSell={() => handleQuickSellCard(
                          userCard.id, 
                          userCard.card.quick_sell_value, 
                          userCard.card.player_name
                        )}
                        actionLabels={{
                          sell: 'Sell'
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-charcoal-700/40 rounded-lg">
                  <p className="text-grey-400">
                    No available players. Open packs to get more cards or check your lineup!
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>
      
      {/* Pack Opening Overlay */}
      {packOpeningStage !== 'closed' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="max-w-6xl w-full px-4">
            {/* Pack Opening Animation */}
            {packOpeningStage === 'opening' && (
              <div className="text-center">
                <div className="mb-8">
                  <div className="inline-block p-8 bg-gradient-to-br from-blue-500/80 to-purple-600/80 rounded-2xl shadow-2xl animate-pulse backdrop-blur-sm">
                    <div className="w-32 h-48 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <span className="text-4xl">📦</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Opening {PACK_TYPES[currentPackType]?.name}...
                </h2>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              </div>
            )}
            
            {/* Card Reveal */}
            {packOpeningStage === 'revealing' && (
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-8">
                  You got {revealedCards.length} cards!
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                  {revealedCards.map((card, index) => (
                    <div
                      key={card.id}
                      className={`transform transition-all duration-700 ${
                        showCards ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'
                      }`}
                      style={{ transitionDelay: `${index * 200}ms` }}
                    >
                      <div className="bg-charcoal-800/80 backdrop-blur-sm rounded-xl p-4 border-2 border-charcoal-600/50 shadow-lg">
                        <div className="text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            card.rarity === 'base' ? 'bg-gray-500 text-white' :
                            card.rarity === 'role_player' ? 'bg-green-500 text-white' :
                            card.rarity === 'starter' ? 'bg-blue-500 text-white' :
                            card.rarity === 'all_star' ? 'bg-purple-500 text-white' :
                            card.rarity === 'legend' ? 'bg-yellow-500 text-black' :
                            'bg-gray-500 text-white'
                          }`}>
                            {card.rarity.toUpperCase()}
                          </div>
                          {card.card_type === 'player' ? (
                            <div>
                              <h3 className="text-white font-bold text-sm mb-1">{card.player_name}</h3>
                              <p className="text-grey-400 text-xs">{card.player_position}</p>
                              <div className="text-xs text-grey-500 mt-2">
                                {card.base_contracts} contracts
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-white font-bold text-sm mb-1">{card.token_type}</h3>
                              <p className="text-grey-400 text-xs">{card.token_description}</p>
                              <div className="text-xs text-grey-500 mt-2">
                                Sell: {card.quick_sell_value} coins
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Complete Stage */}
            {packOpeningStage === 'complete' && (
              <div className="text-center">
                <h2 className="text-4xl font-bold text-green-400 mb-4">Pack Opened!</h2>
                <p className="text-grey-300 mb-6">Cards have been added to your inventory</p>
                <button
                  onClick={() => {
                    setPackOpeningStage('closed');
                    setRevealedCards([]);
                    setShowCards(false);
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-lg backdrop-blur-sm"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token Selection Modal */}
      {tokenModalOpen && selectedPlayerForToken && (
        <TokenSelectionModal
          isOpen={tokenModalOpen}
          onClose={closeTokenModal}
          player={selectedPlayerForToken}
          availableTokens={availableTokens}
          onApplyToken={handleApplyToken}
          appliedTokenId={getAppliedTokenId(selectedPlayerForToken.id)}
        />
      )}

      {/* Debug Panel */}
      <DebugPanel />
    </main>
  );
} 
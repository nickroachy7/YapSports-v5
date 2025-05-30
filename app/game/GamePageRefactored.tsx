"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useCoins } from '@/app/context/CoinsContext';
import Header from '../components/Header';

import GameCarousel from '../components/GameCarousel';
import TokenSelectionModal from '@/app/components/game/TokenSelectionModal';

// Import our new components
import GameHeader from './components/GameHeader/GameHeader';
import LineupGrid from './components/LineupManager/LineupGrid';
import PackShop from './components/PackShop/PackShop';
import InventoryGrid from './components/Inventory/InventoryGrid';

// Import our new hooks
import { useGameState } from './hooks/useGameState';
import { useGameActions } from './hooks/useGameActions';

// Import types
import { UserCardWithCard } from './types';
import LineupSection from './components/lineup/LineupSection';
import { PACK_TYPES } from '@/app/lib/game/packs';
import { DebugPanel } from '@/app/lib/debug-tools';
import { toast } from 'react-hot-toast';

export default function GamePageRefactored() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { coins, setCoins } = useCoins();

  // Get team ID from URL
  const teamId = searchParams.get('team');

  // Add team tokens state
  const [teamTokens, setTeamTokens] = useState<number>(0);

  // Use our custom hooks
  const gameState = useGameState();
  const gameActions = useGameActions({
    currentTeam: gameState.currentTeam,
    cards: gameState.cards,
    lineup: gameState.lineup,
    coins: gameState.coins,
    teamTokens: teamTokens,
    openingPack: gameState.packOpeningState.openingPack,
    appliedTokens: gameState.appliedTokens || {},
    setCards: gameState.setCards,
    setLineup: gameState.setLineup,
    setCoins: gameState.setCoins,
    setTeamTokens: setTeamTokens,
    setOpeningPack: (opening) => gameState.setPackOpeningState(prev => ({ ...prev, openingPack: opening })),
    setAppliedTokens: () => {}, // TODO: implement if needed
    refreshData: async () => {
      await fetchTeamTokens();
      // Add other refresh logic here
    }
  });

  // Function to fetch team tokens
  const fetchTeamTokens = async () => {
    if (!teamId || !auth.user) return;
    
    try {
      const response = await fetch(`/api/teams/${teamId}/tokens`);
      if (response.ok) {
        const data = await response.json();
        setTeamTokens(data.teamTokens || 0);
      }
    } catch (error) {
      console.error('Failed to fetch team tokens:', error);
    }
  };

  // Redirect if no team selected
  useEffect(() => {
    if (!teamId) {
      router.push('/teams');
    }
  }, [teamId, router]);

  // Fetch team data when team changes
  useEffect(() => {
    if (teamId && auth.user) {
      fetchTeamTokens();
    }
  }, [teamId, auth.user]);

  // Sync coins with global state
  useEffect(() => {
    if (gameState.coins !== coins) {
      setCoins(gameState.coins);
    }
  }, [gameState.coins, coins, setCoins]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push('/auth/signin');
    }
  }, [auth.isLoading, auth.user, router]);

  // Initial load
  useEffect(() => {
    const loadGameData = async () => {
      if (!auth.user || auth.isLoading || !gameState.currentTeam) return;
      
      gameState.setLoading(true);
      try {
        await Promise.all([
          gameState.fetchUserData(),
          gameState.fetchInventory()
        ]);
      } catch (error) {
        console.error('Error loading game data:', error);
      } finally {
        gameState.setLoading(false);
      }
    };

    loadGameData();
  }, [auth.user, auth.isLoading, gameState.currentTeam, gameState.fetchUserData, gameState.fetchInventory, gameState]);

  // Drag and drop handlers
  const handleCardDragStart = (e: React.DragEvent, card: UserCardWithCard) => {
    if (card.card.card_type === 'token') {
      gameState.setDraggedToken(card);
      gameState.setDraggedCard(null);
    } else {
      gameState.setDraggedCard(card);
      gameState.setDraggedToken(null);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragEnd = () => {
    gameState.setDraggedCard(null);
    gameState.setDraggedToken(null);
  };

  const handleLineupDragOver = (e: React.DragEvent, position: string) => {
    e.preventDefault();
    gameState.setDragOverPosition(position);
  };

  const handleLineupDragLeave = () => {
    gameState.setDragOverPosition(null);
  };

  const handleLineupDrop = async (e: React.DragEvent, position: string) => {
    e.preventDefault();
    gameState.setDragOverPosition(null);

    if (gameState.draggedCard) {
      await gameActions.handleAddToLineup(gameState.draggedCard, position);
      gameState.setDraggedCard(null);
    }
  };

  const handlePlayerDragOver = (e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    if (gameState.draggedToken) {
      gameState.setDragOverPlayer(playerId);
    }
  };

  const handlePlayerDragLeave = () => {
    gameState.setDragOverPlayer(null);
  };

  const handleTokenDropOnPlayer = async (e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    gameState.setDragOverPlayer(null);

    if (gameState.draggedToken) {
      await gameActions.handleApplyToken(playerId, gameState.draggedToken.id);
      gameState.setDraggedToken(null);
    }
  };

  // Token utility functions
  const getAppliedTokenId = (playerCardId: string): string | undefined => {
    return gameState.appliedTokens[playerCardId];
  };

  const getAppliedTokenInfo = (playerCardId: string) => {
    const tokenId = getAppliedTokenId(playerCardId);
    if (!tokenId) return null;
    
    const tokenCard = gameState.cards.find(c => c.id === tokenId);
    if (!tokenCard) return null;
    
    return {
      id: tokenCard.id,
      type: tokenCard.card.token_type,
      description: tokenCard.card.token_description
    };
  };

  const getTokenIcon = (tokenType: string, effect: string) => {
    if (tokenType === 'contract') return '⚡';
    if (tokenType === 'play') return '🎮';
    if (effect?.includes('2x')) return '2️⃣';
    if (effect?.includes('3x')) return '3️⃣';
    return '✨';
  };

  // Loading state
  if (gameState.loading || auth.isLoading || !gameState.currentTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">
              {!gameState.currentTeam ? 'Loading team...' : 'Loading game...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!auth.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Game Header */}
        <GameHeader
          currentTeam={gameState.currentTeam}
          coins={gameState.coins}
          teamTokens={teamTokens}
          onRefresh={gameState.refreshData}
          isRefreshing={gameState.isRefreshing}
        />

        <div className="space-y-8">
          {/* Starting Lineup */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">🏀</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Starting Lineup</h3>
                <p className="text-slate-400 text-sm">Build your team for today's games</p>
              </div>
            </div>

            <LineupSection
              lineup={gameState.lineup}
              isLineupComplete={gameState.isLineupComplete}
              handleSubmitLineup={gameActions.handleSubmitLineup}
              dragOverPosition={gameState.dragOverPosition}
              dragOverPlayer={gameState.dragOverPlayer}
              draggedToken={gameState.draggedToken}
              handleDragOver={handleLineupDragOver}
              handleDragLeave={handleLineupDragLeave}
              handleDrop={handleLineupDrop}
              handlePlayerDragOver={handlePlayerDragOver}
              handlePlayerDragLeave={handlePlayerDragLeave}
              handleTokenDropOnPlayer={handleTokenDropOnPlayer}
              getAppliedTokenId={getAppliedTokenId}
              getAppliedTokenInfo={getAppliedTokenInfo}
              getTokenIcon={getTokenIcon}
              handleApplyToken={gameActions.handleApplyToken}
              openTokenModal={(player) => gameState.setTokenModalPlayer(player)}
              removeFromLineup={gameActions.handleRemoveFromLineup}
              handleQuickSellLineupCard={gameActions.handleQuickSellLineupCard}
            />
          </div>

          {/* Pack Shop and Sell Zone */}
          <PackShop
            coins={gameState.coins}
            teamTokens={teamTokens}
            cards={gameState.cards}
            currentTeam={gameState.currentTeam}
            openingPack={gameState.openingPack}
            draggedCard={gameState.draggedCard}
            onOpenPack={gameActions.handleOpenPack}
            onQuickSellCard={gameActions.handleQuickSellCard}
            setDraggedCard={gameState.setDraggedCard}
          />

          {/* Available Tokens */}
          <InventoryGrid
            title="Available Tokens"
            cards={gameState.availableTokens}
            emptyMessage="No tokens available. Open packs to get tokens!"
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onQuickSellCard={gameActions.handleQuickSellCard}
          />

          {/* Available Players */}
          <InventoryGrid
            title="Available Players"
            cards={gameState.availablePlayers}
            emptyMessage="No players available. Open packs to get players!"
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onQuickSellCard={gameActions.handleQuickSellCard}
          />
        </div>

        {/* Today's Games */}
        <div className="mt-12">
          <GameCarousel />
        </div>

        {/* Token Selection Modal */}
        {gameState.tokenModalPlayer && (
          <TokenSelectionModal
            isOpen={true}
            onClose={() => gameState.setTokenModalPlayer(null)}
            player={gameState.tokenModalPlayer}
            availableTokens={gameState.availableTokens}
            onApplyToken={async (tokenId) => {
              await gameActions.handleApplyToken(gameState.tokenModalPlayer!.id, tokenId);
              gameState.setTokenModalPlayer(null);
            }}
            appliedTokenId={getAppliedTokenId(gameState.tokenModalPlayer.id)}
          />
        )}

        {/* Pack Opening Overlay */}
        {gameState.packOpeningState.packOpeningStage !== 'closed' && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
            <div className="max-w-6xl w-full px-4">
              {/* Pack Opening Animation */}
              {gameState.packOpeningState.packOpeningStage === 'opening' && (
                <div className="text-center">
                  <div className="mb-8">
                    <div className="inline-block p-8 bg-gradient-to-br from-blue-500/80 to-purple-600/80 rounded-2xl shadow-2xl animate-pulse backdrop-blur-sm">
                      <div className="w-32 h-48 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <span className="text-4xl">📦</span>
                      </div>
                    </div>
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Opening {PACK_TYPES[gameState.packOpeningState.currentPackType]?.name}...
                  </h2>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </div>
              )}
              
              {/* Card Reveal */}
              {gameState.packOpeningState.packOpeningStage === 'revealing' && (
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-white mb-8">
                    You got {gameState.packOpeningState.revealedCards.length} cards!
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                    {gameState.packOpeningState.revealedCards.map((card, index) => (
                      <div
                        key={card.id}
                        className={`transform transition-all duration-700 ${
                          gameState.packOpeningState.showCards ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'
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
              {gameState.packOpeningState.packOpeningStage === 'complete' && (
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-green-400 mb-4">Pack Opened!</h2>
                  <p className="text-grey-300 mb-6">Cards have been added to your inventory</p>
                  <button
                    onClick={() => {
                      gameState.setPackOpeningState({
                        ...gameState.packOpeningState,
                        packOpeningStage: 'closed',
                        revealedCards: [],
                        showCards: false,
                        openingPack: false
                      });
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

        {/* Debug Panel */}
        <DebugPanel />
      </div>
    </div>
  );
} 
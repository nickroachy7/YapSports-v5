"use client";

import React from 'react';
import { PACK_TYPES } from '@/app/lib/game/packs';
import { UserCardWithCard, Team } from '../../types';

interface PackShopProps {
  coins: number;
  teamTokens: number;
  cards: UserCardWithCard[];
  currentTeam: Team | null;
  openingPack: boolean;
  draggedCard: UserCardWithCard | null;
  onOpenPack: (packId: string) => void;
  onQuickSellCard: (cardId: string, sellValue: number, playerName?: string) => void;
  setDraggedCard: (card: UserCardWithCard | null) => void;
}

const PackShop: React.FC<PackShopProps> = ({
  coins,
  teamTokens,
  cards,
  currentTeam,
  openingPack,
  draggedCard,
  onOpenPack,
  onQuickSellCard,
  setDraggedCard
}) => {
  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Pack Buttons */}
      {Object.entries(PACK_TYPES).map(([packId, pack]) => {
        const canAfford = teamTokens >= pack.cost;
        const totalCardsInPack = pack.cardCount;
        const wouldExceedLimit = cards.length + totalCardsInPack > 13;
        const isStarterPack = packId === 'starter';
        const isStarterAvailable = isStarterPack && !currentTeam?.hasClaimedStarter;
        const isAvailable = !isStarterPack || isStarterAvailable;

        return (
          <button
            key={packId}
            onClick={() => onOpenPack(packId)}
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
                      💰 {pack.cost >= 1000 ? `${pack.cost/1000}k` : pack.cost}
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
            const sellValue = draggedCard.card.team_token_value;
            const playerName = draggedCard.card.player_name || draggedCard.card.token_type;
            onQuickSellCard(draggedCard.id, sellValue, playerName);
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
                Get {draggedCard.card.team_token_value} tokens
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
  );
};

export default PackShop; 
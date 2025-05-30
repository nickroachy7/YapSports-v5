"use client";

import React from 'react';
import Card from '@/app/components/game/Card';
import { UserCardWithCard, Lineup } from '../../types';

interface LineupGridProps {
  lineup: Lineup;
  dragOverPosition: string | null;
  dragOverPlayer: string | null;
  draggedToken: UserCardWithCard | null;
  onDragOver: (e: React.DragEvent, position: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, position: string) => void;
  onPlayerDragOver: (e: React.DragEvent, playerId: string) => void;
  onPlayerDragLeave: () => void;
  onTokenDropOnPlayer: (e: React.DragEvent, playerId: string) => void;
  onOpenTokenModal: (player: UserCardWithCard) => void;
  onRemoveFromLineup: (position: string) => void;
  onQuickSellLineupCard: (card: UserCardWithCard, position: string) => void;
  getAppliedTokenId: (playerCardId: string) => string | undefined;
  getAppliedTokenInfo: (playerCardId: string) => any;
  getTokenIcon: (tokenType: string, effect: string) => string;
  handleApplyToken: (playerCardId: string, tokenCardId: string) => Promise<void>;
}

const LineupGrid: React.FC<LineupGridProps> = ({
  lineup,
  dragOverPosition,
  dragOverPlayer,
  draggedToken,
  onDragOver,
  onDragLeave,
  onDrop,
  onPlayerDragOver,
  onPlayerDragLeave,
  onTokenDropOnPlayer,
  onOpenTokenModal,
  onRemoveFromLineup,
  onQuickSellLineupCard,
  getAppliedTokenId,
  getAppliedTokenInfo,
  getTokenIcon,
  handleApplyToken
}) => {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

  return (
    <div className="grid grid-cols-5 gap-4">
      {positions.map((position) => {
        const card = lineup[position];
        
        return (
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
              onDragOver={(e) => onDragOver(e, position)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, position)}
            >
              {card ? (
                <div 
                  className={`relative group w-full h-full transition-all ${
                    dragOverPlayer === card.id ? 'ring-4 ring-purple-500 ring-opacity-50 scale-105' : ''
                  }`}
                  onDragOver={(e) => onPlayerDragOver(e, card.id)}
                  onDragLeave={onPlayerDragLeave}
                  onDrop={(e) => onTokenDropOnPlayer(e, card.id)}
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
                        onClick={() => onOpenTokenModal(card)}
                        className="flex-1 px-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 rounded-bl-xl"
                      >
                        <span>✨</span>
                        <span className="hidden sm:inline">{getAppliedTokenId(card.id) ? 'Change' : 'Apply'}</span>
                        <span className="sm:hidden">{getAppliedTokenId(card.id) ? 'Chg' : 'Add'}</span>
                      </button>
                      <button
                        onClick={() => onRemoveFromLineup(position)}
                        className="flex-1 px-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => onQuickSellLineupCard(card, position)}
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
        );
      })}
    </div>
  );
};

export default LineupGrid; 
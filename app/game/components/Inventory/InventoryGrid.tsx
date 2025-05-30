"use client";

import React from 'react';
import Card from '@/app/components/game/Card';
import { UserCardWithCard } from '../../types';

interface InventoryGridProps {
  title: string;
  cards: UserCardWithCard[];
  emptyMessage: string;
  onCardDragStart: (e: React.DragEvent, card: UserCardWithCard) => void;
  onCardDragEnd: () => void;
  onQuickSellCard: (cardId: string, sellValue: number, playerName?: string) => void;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({
  title,
  cards,
  emptyMessage,
  onCardDragStart,
  onCardDragEnd,
  onQuickSellCard
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-xl">{title.includes('Token') ? '✨' : '👥'}</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <p className="text-slate-400 text-sm">
            {cards.length} {title.includes('Token') ? 'tokens' : 'players'} available
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-6xl mb-4 opacity-50">
            {title.includes('Token') ? '✨' : '👥'}
          </div>
          <p className="text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {cards.map((userCard) => (
            <div
              key={userCard.id}
              className="group relative"
              draggable
              onDragStart={(e) => onCardDragStart(e, userCard)}
              onDragEnd={onCardDragEnd}
            >
              <Card card={userCard.card} userCard={userCard} />
              
              {/* Quick Sell Button */}
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <button
                  onClick={() => {
                    const sellValue = userCard.card.quick_sell_value;
                    const playerName = userCard.card.player_name || userCard.card.token_type;
                    onQuickSellCard(userCard.id, sellValue, playerName);
                  }}
                  className="w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 rounded-b-xl"
                >
                  <span>💰</span>
                  <span>Sell for {userCard.card.quick_sell_value}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryGrid; 
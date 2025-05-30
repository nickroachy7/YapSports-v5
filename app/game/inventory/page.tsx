'use client'

import { useState, useEffect } from 'react'
import Card from '@/app/components/game/Card'
import { Card as CardType } from '@/app/lib/supabase'
import { RARITIES } from '@/app/lib/constants/rarities'

interface UserCardWithCard {
  id: string
  contracts_remaining: number
  contracts_used: number
  card: CardType
}

export default function InventoryPage() {
  const [cards, setCards] = useState<UserCardWithCard[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'player' | 'token'>('all')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchInventory()
  }, [])
  
  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/cards/inventory')
      const data = await response.json()
      setCards(data.cards || [])
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCardSelect = (cardId: string) => {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      newSelected.add(cardId)
    }
    setSelectedCards(newSelected)
  }
  
  const handleQuickSell = async () => {
    if (selectedCards.size === 0) return
    
    const selectedCardsList = Array.from(selectedCards)
    const totalValue = selectedCardsList.reduce((sum, cardId) => {
      const card = cards.find(c => c.id === cardId)
      return sum + (card?.card.quick_sell_value || 0)
    }, 0)
    
    if (!confirm(`Sell ${selectedCards.size} cards for ${totalValue} coins?`)) {
      return
    }
    
    try {
      const response = await fetch('/api/cards/quick-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: selectedCardsList })
      })
      
      if (response.ok) {
        // Remove sold cards from state
        setCards(cards.filter(c => !selectedCards.has(c.id)))
        setSelectedCards(new Set())
        alert(`Sold ${selectedCardsList.length} cards for ${totalValue} coins!`)
      }
    } catch (error) {
      console.error('Failed to sell cards:', error)
      alert('Failed to sell cards')
    }
  }
  
  const filteredCards = cards.filter(userCard => {
    if (filter !== 'all' && userCard.card.card_type !== filter) return false
    if (rarityFilter !== 'all' && userCard.card.rarity !== rarityFilter) return false
    return true
  })
  
  const groupedCards = filteredCards.reduce((groups, userCard) => {
    const key = userCard.card.card_type === 'player' 
      ? userCard.card.player_position || 'Other'
      : userCard.card.token_type || 'Other'
    
    if (!groups[key]) groups[key] = []
    groups[key].push(userCard)
    return groups
  }, {} as Record<string, UserCardWithCard[]>)
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-400">Loading inventory...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Card Inventory</h1>
          <div className="flex items-center gap-4">
            <div className="text-white">
              <span className="text-gray-400">Total Cards:</span> {cards.length}
            </div>
            {selectedCards.size > 0 && (
              <button
                onClick={handleQuickSell}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition-colors"
              >
                Quick Sell ({selectedCards.size})
              </button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Cards
            </button>
            <button
              onClick={() => setFilter('player')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'player' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setFilter('token')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'token' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tokens
            </button>
          </div>
          
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg"
          >
            <option value="all">All Rarities</option>
            {Object.entries(RARITIES).map(([key, rarity]) => (
              <option key={key} value={key}>{rarity.name}</option>
            ))}
          </select>
        </div>
        
        {/* Cards Grid */}
        {Object.entries(groupedCards).map(([group, groupCards]) => (
          <div key={group} className="mb-8">
            <h2 className="text-xl font-bold text-gray-300 mb-4">
              {group} ({groupCards.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {groupCards.map((userCard) => (
                <Card
                  key={userCard.id}
                  card={userCard.card}
                  userCard={userCard}
                  selected={selectedCards.has(userCard.id)}
                  onClick={() => handleCardSelect(userCard.id)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {filteredCards.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">No cards found</p>
            <p className="text-gray-500 mt-2">Try adjusting your filters or open some packs!</p>
          </div>
        )}
      </div>
    </div>
  )
} 
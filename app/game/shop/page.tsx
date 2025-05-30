'use client'

import { useState, useEffect } from 'react'
import { PACK_TYPES } from '@/app/lib/game/packs'
import Card from '@/app/components/game/Card'
import { Card as CardType } from '@/app/lib/supabase'

export default function ShopPage() {
  const [coins, setCoins] = useState(0)
  const [openingPack, setOpeningPack] = useState(false)
  const [revealedCards, setRevealedCards] = useState<CardType[]>([])
  const [showCards, setShowCards] = useState(false)
  const [hasStarterPack, setHasStarterPack] = useState(false)
  
  useEffect(() => {
    fetchUserData()
  }, [])
  
  const fetchUserData = async () => {
    // TODO: Fetch actual user data
    setCoins(1000) // Mock data
    setHasStarterPack(false) // Mock - user hasn't opened starter pack
  }
  
  const openPack = async (packId: string) => {
    if (openingPack) return
    
    const pack = PACK_TYPES[packId]
    if (!pack) return
    
    if (pack.cost > coins && packId !== 'starter') {
      alert('Not enough coins!')
      return
    }
    
    setOpeningPack(true)
    setRevealedCards([])
    setShowCards(false)
    
    try {
      const response = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packType: packId })
      })
      
      const data = await response.json()
      
      if (data.error) {
        alert(data.error)
        return
      }
      
      // Update coins if pack was purchased
      if (pack.cost > 0) {
        setCoins(coins - pack.cost)
      }
      
      // Mark starter pack as opened
      if (packId === 'starter') {
        setHasStarterPack(true)
      }
      
      // Reveal cards with animation
      setRevealedCards(data.cards)
      setTimeout(() => setShowCards(true), 500)
      
    } catch (error) {
      console.error('Failed to open pack:', error)
      alert('Failed to open pack')
    } finally {
      setOpeningPack(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Pack Shop</h1>
          <div className="flex items-center gap-2 text-2xl">
            <span className="text-yellow-400">🪙</span>
            <span className="text-white font-bold">{coins}</span>
          </div>
        </div>
        
        {/* Pack Opening Animation */}
        {revealedCards.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8">
            <div className="max-w-6xl w-full">
              <h2 className="text-3xl font-bold text-white text-center mb-8">
                Pack Contents
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
                {revealedCards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`transform transition-all duration-500 ${
                      showCards ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <Card card={card} />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button
                  onClick={() => {
                    setRevealedCards([])
                    setShowCards(false)
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(PACK_TYPES).map(([packId, pack]) => {
            const isStarterPack = packId === 'starter'
            const canAfford = coins >= pack.cost || isStarterPack
            const isAvailable = !isStarterPack || !hasStarterPack
            
            return (
              <div
                key={packId}
                className={`bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                  !isAvailable ? 'border-gray-700 opacity-50' : 
                  canAfford ? 'border-blue-500 hover:border-blue-400' : 'border-gray-700'
                }`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{pack.name}</h3>
                <p className="text-gray-400 mb-4">{pack.description}</p>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Contains:</p>
                  <ul className="text-sm text-gray-300">
                    <li>• {pack.playerCards} Player Cards</li>
                    <li>• {pack.tokenCards} Token Cards</li>
                    {pack.guaranteedRarities && (
                      <li className="text-yellow-400">
                        • Guaranteed {pack.guaranteedRarities[0]} or better!
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xl font-bold">
                    {pack.cost === 0 ? (
                      <span className="text-green-400">FREE</span>
                    ) : (
                      <span className={canAfford ? 'text-yellow-400' : 'text-red-400'}>
                        🪙 {pack.cost}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => openPack(packId)}
                    disabled={!isAvailable || (!canAfford && !isStarterPack) || openingPack}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                      !isAvailable ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                      !canAfford && !isStarterPack ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                      openingPack ? 'bg-gray-600 text-gray-400' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {!isAvailable ? 'Already Claimed' :
                     openingPack ? 'Opening...' :
                     'Open Pack'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Info Section */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Pack Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">Rarity Odds:</h3>
              <ul className="space-y-1">
                <li>• Common: 65%</li>
                <li>• Uncommon: 25%</li>
                <li>• Rare: 8%</li>
                <li>• Epic: 1.9%</li>
                <li>• Legendary: 0.1%</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">Tips:</h3>
              <ul className="space-y-1">
                <li>• Higher tier packs guarantee better minimum rarity</li>
                <li>• Token cards can dramatically boost your scores</li>
                <li>• Save coins for Gold packs for best value</li>
                <li>• Quick sell duplicate cards for more coins</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
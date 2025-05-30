import { NextResponse } from 'next/server'
import { openPack as openPackLogic, PACK_TYPES, generatePackCards, addCardToUserInventory } from '@/app/lib/game/packs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { packType, teamId } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch user data with the authenticated client
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (userError || !userRow) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 400 }
      )
    }
    
    // If team-specific pack opening, check team's starter pack status
    if (packType === 'starter' && teamId) {
      const { data: teamData, error: teamError } = await supabase
        .from('user_teams')
        .select('has_claimed_starter')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single()
      
      if (teamError || !teamData) {
        return NextResponse.json(
          { error: 'Team not found or access denied' },
          { status: 400 }
        )
      }
      
      if (teamData.has_claimed_starter) {
        return NextResponse.json(
          { error: 'This team has already claimed its starter pack' },
          { status: 400 }
        )
      }
    } else if (packType === 'starter' && !teamId) {
      // Legacy check for non-team starter pack
      if (userRow.packs_opened > 0) {
        return NextResponse.json(
          { error: 'Starter pack already claimed' },
          { status: 400 }
        )
      }
    }
    
    // Check current inventory count to enforce 13-card limit
    let inventoryQuery = supabase
      .from('user_cards')
      .select('id')
      .eq('user_id', user.id)
    
    // Filter by team if specified
    if (teamId) {
      inventoryQuery = inventoryQuery.eq('team_id', teamId)
    } else {
      inventoryQuery = inventoryQuery.is('team_id', null)
    }
    
    const { data: currentCards, error: inventoryError } = await inventoryQuery
    
    if (inventoryError) {
      return NextResponse.json(
        { error: 'Failed to check inventory' },
        { status: 400 }
      )
    }
    
    const currentCardCount = currentCards?.length || 0
    
    // Validate pack definition
    const packDef = PACK_TYPES[packType]
    if (!packDef) {
      return NextResponse.json(
        { error: 'Invalid pack type' },
        { status: 400 }
      )
    }
    
    // Check if opening this pack would exceed the 13-card limit
    const totalCardsInPack = packDef.playerCards + packDef.tokenCards
    if (currentCardCount + totalCardsInPack > 13) {
      return NextResponse.json(
        { error: `Cannot open pack: Would exceed 13-card limit (currently have ${currentCardCount} cards)` },
        { status: 400 }
      )
    }
    
    // Check team tokens if team-specific pack opening
    if (packDef.cost > 0 && teamId) {
      // Check team tokens for team-specific pack opening
      const { data: teamCurrency, error: currencyError } = await supabase
        .from('team_currency')
        .select('team_tokens')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single()
      
      if (currencyError || !teamCurrency) {
        return NextResponse.json(
          { error: 'Failed to fetch team tokens' },
          { status: 400 }
        )
      }
      
      if (teamCurrency.team_tokens < packDef.cost) {
        return NextResponse.json(
          { error: 'Insufficient team tokens' },
          { status: 400 }
        )
      }
    } else if (packDef.cost > 0 && !teamId) {
      // Fall back to coins for non-team pack opening
      if (userRow.coins < packDef.cost) {
        return NextResponse.json(
          { error: 'Insufficient coins' },
          { status: 400 }
        )
      }
    }
    
    // Deduct team tokens or coins and update pack tracking
    if (packDef.cost > 0) {
      if (teamId) {
        // Deduct team tokens
        const { data: teamCurrency, error: fetchError } = await supabase
          .from('team_currency')
          .select('team_tokens')
          .eq('user_id', user.id)
          .eq('team_id', teamId)
          .single()
        
        if (fetchError || !teamCurrency) {
          return NextResponse.json(
            { error: 'Failed to fetch team tokens for deduction' },
            { status: 400 }
          )
        }
        
        const { error: updateError } = await supabase
          .from('team_currency')
          .update({
            team_tokens: teamCurrency.team_tokens - packDef.cost
          })
          .eq('user_id', user.id)
          .eq('team_id', teamId)
        
        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to deduct team tokens' },
            { status: 400 }
          )
        }
      } else {
        // Deduct coins for non-team pack opening
        const { error: updateError } = await supabase
          .from('users')
          .update({
            coins: userRow.coins - packDef.cost,
            packs_opened: userRow.packs_opened + 1
          })
          .eq('id', user.id)
        
        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to deduct coins' },
            { status: 400 }
          )
        }
      }
    } else if (packType === 'starter') {
      // For starter pack, update tracking
      if (teamId) {
        // Update team's starter pack status
        await supabase
          .from('user_teams')
          .update({ has_claimed_starter: true })
          .eq('id', teamId)
          .eq('user_id', user.id)
      } else {
        // Legacy: increment user's packs_opened
        await supabase
          .from('users')
          .update({ packs_opened: userRow.packs_opened + 1 })
          .eq('id', user.id)
      }
    }
    
    // Generate cards and add to inventory
    const cards = await generatePackCards(packDef)
    const userCards = []
    const inventoryErrors = []
    
    console.log(`Generated ${cards.length} cards for user ${user.id}${teamId ? ` (team: ${teamId})` : ''}`)
    console.log('Sample card:', cards[0])
    
    for (const card of cards) {
      try {
        console.log(`Adding card ${card.id} to user ${user.id} inventory${teamId ? ` (team: ${teamId})` : ''}`)
        
        // Add card to user's inventory with team association
        const insertData: any = {
          user_id: user.id,
          card_id: card.id,
          contracts_remaining: card.base_contracts,
          contracts_used: 0,
          in_lineup: false
        }
        
        // Add team_id if specified
        if (teamId) {
          insertData.team_id = teamId
        }
        
        const { data: userCard, error: userCardError } = await supabase
          .from('user_cards')
          .insert(insertData)
          .select()
          .single()
        
        if (userCardError) {
          console.error('User card insertion error:', userCardError)
          throw userCardError
        }
        
        console.log('Successfully added user card:', userCard)
        userCards.push({ ...userCard, card })
      } catch (error) {
        console.error('Failed to add card to inventory:', error)
        inventoryErrors.push({ cardId: card.id, error: error instanceof Error ? error.message : String(error) })
      }
    }
    
    console.log(`Successfully added ${userCards.length} cards to inventory`)
    console.log('Inventory errors:', inventoryErrors)
    
    // Filter out any null/invalid userCards and cards
    const filteredUserCards = userCards.filter(uc => uc && uc.card && uc.card.id)
    const filteredCards = cards.filter(card => card && card.id)
    
    return NextResponse.json({
      cards: filteredCards,
      userCards: filteredUserCards,
      inventoryErrors
    })
  } catch (error) {
    console.error('Pack opening error:', error)
    return NextResponse.json(
      { error: 'Failed to open pack', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 
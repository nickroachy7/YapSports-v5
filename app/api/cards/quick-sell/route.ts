import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { cardIds, teamId } = await request.json()
    
    // Use SSR/cookie-based auth
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get the cards to calculate total value using authenticated client
    let cardQuery = supabase
      .from('user_cards')
      .select('*, card:cards(*)')
      .eq('user_id', user.id)
      .in('id', cardIds)
    
    // Filter by team if specified
    if (teamId) {
      cardQuery = cardQuery.eq('team_id', teamId)
    } else {
      cardQuery = cardQuery.is('team_id', null)
    }
    
    const { data: userCards, error: fetchError } = await cardQuery
    
    if (fetchError) {
      console.error('Failed to fetch cards for selling:', fetchError)
      throw fetchError
    }
    
    // Calculate total team tokens using the new field
    const totalTokens = userCards.reduce((sum, uc) => sum + (uc.card.team_token_value || 0), 0)
    
    // Delete the cards
    let deleteQuery = supabase
      .from('user_cards')
      .delete()
      .eq('user_id', user.id)
      .in('id', cardIds)
    
    // Filter by team if specified
    if (teamId) {
      deleteQuery = deleteQuery.eq('team_id', teamId)
    } else {
      deleteQuery = deleteQuery.is('team_id', null)
    }
    
    const { error: deleteError } = await deleteQuery
    
    if (deleteError) {
      console.error('Failed to delete cards:', deleteError)
      throw deleteError
    }
    
    if (teamId) {
      // Update team tokens
      const { data: teamCurrency, error: fetchTeamError } = await supabase
        .from('team_currency')
        .select('team_tokens')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single()
      
      if (fetchTeamError) {
        console.error('Failed to fetch team tokens:', fetchTeamError)
        throw fetchTeamError
      }
      
      const { error: updateError } = await supabase
        .from('team_currency')
        .update({ 
          team_tokens: teamCurrency.team_tokens + totalTokens
        })
        .eq('user_id', user.id)
        .eq('team_id', teamId)
      
      if (updateError) {
        console.error('Failed to update team tokens:', updateError)
        throw updateError
      }
      
      console.log(`User ${user.id} sold ${cardIds.length} cards for ${totalTokens} team tokens (team: ${teamId})`)
      
      return NextResponse.json({
        success: true,
        tokensEarned: totalTokens,
        teamId: teamId
      })
    } else {
      // Fall back to coins for non-team sales
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('coins')
        .eq('id', user.id)
        .single()
      
      if (userError) {
        console.error('Failed to fetch user coins:', userError)
        throw userError
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          coins: userData.coins + totalTokens
        })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Failed to update user coins:', updateError)
        throw updateError
      }
      
      console.log(`User ${user.id} sold ${cardIds.length} cards for ${totalTokens} coins`)
      
      return NextResponse.json({
        success: true,
        coinsEarned: totalTokens
      })
    }
  } catch (error) {
    console.error('Quick sell error:', error)
    return NextResponse.json(
      { error: 'Failed to sell cards' },
      { status: 500 }
    )
  }
} 
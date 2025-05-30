import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { cardId, position, inLineup } = await request.json()
    
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Update the user card's lineup status
    const { error: updateError } = await supabase
      .from('user_cards')
      .update({
        in_lineup: inLineup,
        lineup_position: position
      })
      .eq('id', cardId)
      .eq('user_id', user.id) // Ensure user owns the card
    
    if (updateError) {
      console.error('Failed to update card lineup status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update lineup' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update lineup error:', error)
    return NextResponse.json(
      { error: 'Failed to update lineup' },
      { status: 500 }
    )
  }
} 
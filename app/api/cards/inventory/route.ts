import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // Use SSR/cookie-based auth
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get team ID from query parameters
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team')
    
    // Build query based on whether team filtering is requested
    let query = supabase
      .from('user_cards')
      .select(`
        *,
        card:cards(*)
      `)
      .eq('user_id', user.id)
    
    // If team ID is provided, filter by team
    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      // If no team specified, get cards not assigned to any team (legacy behavior)
      query = query.is('team_id', null)
    }
    
    const { data: inventory, error: inventoryError } = await query
      .order('acquired_date', { ascending: false })
    
    if (inventoryError) {
      console.error('Inventory fetch error:', inventoryError)
      throw inventoryError
    }
    
    console.log(`Found ${inventory?.length || 0} cards for user ${user.id}${teamId ? ` (team: ${teamId})` : ' (no team)'}`)
    
    return NextResponse.json({
      success: true,
      cards: inventory || []
    })
  } catch (error) {
    console.error('Inventory fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
} 
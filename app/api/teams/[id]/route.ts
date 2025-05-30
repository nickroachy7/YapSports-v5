import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET - Fetch a specific team by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch the specific team
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns the team
      .single()
    
    if (teamError) {
      console.error('Team fetch error:', teamError)
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      team: team
    })
  } catch (error) {
    console.error('Team fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
} 
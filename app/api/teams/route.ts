import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET - Fetch user's teams
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch user's teams
    const { data: teams, error: teamsError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false })
    
    if (teamsError) {
      console.error('Teams fetch error:', teamsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      teams: teams || []
    })
  } catch (error) {
    console.error('Teams fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST - Create a new team
export async function POST(request: Request) {
  try {
    const { name, description, league } = await request.json()
    
    console.log('Creating team with data:', { name, description, league })
    
    if (!name || !league) {
      return NextResponse.json(
        { success: false, error: 'Name and league are required' },
        { status: 400 }
      )
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('User authenticated:', user.id)
    
    // Create the team
    const teamData = {
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      league: league,
      is_active: true,
      has_claimed_starter: false
    }
    
    console.log('Inserting team data:', teamData)
    
    const { data: team, error: createError } = await supabase
      .from('user_teams')
      .insert(teamData)
      .select()
      .single()
    
    if (createError) {
      console.error('Team creation error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      
      // Check if it's a unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'You already have a team with this name' },
          { status: 400 }
        )
      }
      
      // Check if table doesn't exist
      if (createError.code === '42P01') {
        return NextResponse.json(
          { success: false, error: 'Database not set up yet. Please run the migration first.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: `Database error: ${createError.message}` },
        { status: 500 }
      )
    }
    
    console.log('Team created successfully:', team)
    
    return NextResponse.json({
      success: true,
      team: team
    })
  } catch (error) {
    console.error('Team creation error:', error)
    return NextResponse.json(
      { success: false, error: `Server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
} 
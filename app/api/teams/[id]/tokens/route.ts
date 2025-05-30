import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch team tokens for this team
    const { data: teamCurrency, error: currencyError } = await supabase
      .from('team_currency')
      .select('team_tokens')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single()

    if (currencyError) {
      console.error('Team currency fetch error:', currencyError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch team tokens' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      teamTokens: teamCurrency?.team_tokens || 0
    })
  } catch (error) {
    console.error('Team tokens fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team tokens' },
      { status: 500 }
    )
  }
} 
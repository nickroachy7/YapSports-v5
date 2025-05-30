import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  // In API routes, we need to manually pass the auth token
  // from the cookie to authenticate the user
  const cookieStore = cookies()
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
  
  // Get the access token from cookies
  const accessToken = cookieStore.get('sb-access-token')?.value || 
                     cookieStore.get('supabase-auth-token')?.value ||
                     cookieStore.get('sb-auth-token')?.value
  
  if (accessToken) {
    // Set the auth header manually
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '' // We don't need this for API routes
    })
  }
  
  return supabase
} 
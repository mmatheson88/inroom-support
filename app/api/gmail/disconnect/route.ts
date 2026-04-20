import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { userId } = await request.json()

  const { error } = await supabase
    .from('users')
    .update({
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_connected: false,
    })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

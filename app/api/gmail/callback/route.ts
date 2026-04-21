import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encrypt } from '@/lib/crypto'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(`${origin}/inbox-connect?error=missing_params`)
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://inroom-support.vercel.app/api/gmail/callback'
  )

  let tokens
  try {
    const result = await oauth2Client.getToken(code)
    tokens = result.tokens
  } catch {
    return NextResponse.redirect(`${origin}/inbox-connect?error=token_exchange_failed`)
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/inbox-connect?error=no_token`)
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('users')
    .update({
      gmail_access_token: encrypt(tokens.access_token),
      gmail_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      gmail_connected: true,
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.redirect(`${origin}/inbox-connect?error=db_update_failed`)
  }

  return NextResponse.redirect(`${origin}/inbox-connect?connected=true`)
}

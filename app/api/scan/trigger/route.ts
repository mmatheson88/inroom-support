import { createServiceClient } from '@/lib/supabase/service'
import { scanUserInbox } from '@/lib/scan-emails'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const deepScan = body.deepScan === true

  const supabase = createServiceClient()

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('gmail_connected', true)

  if (!users?.length) {
    return NextResponse.json({ message: 'No connected inboxes' })
  }

  await Promise.all(users.map(u => scanUserInbox(u.id, deepScan)))

  return NextResponse.json({ success: true, scanned: users.length, deepScan })
}

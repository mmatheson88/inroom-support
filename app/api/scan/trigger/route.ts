import { createServiceClient } from '@/lib/supabase/service'
import { scanUserInbox } from '@/lib/scan-emails'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const deepScan = body.deepScan === true
  console.log(`[trigger] manual scan started deepScan=${deepScan}`)

  const supabase = createServiceClient()

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('gmail_connected', true)

  if (!users?.length) {
    console.log(`[trigger] no connected inboxes found`)
    return NextResponse.json({ message: 'No connected inboxes' })
  }

  console.log(`[trigger] scanning ${users.length} connected inbox(es)`)
  await Promise.all(users.map(u => scanUserInbox(u.id, deepScan)))
  console.log(`[trigger] all scans complete`)

  return NextResponse.json({ success: true, scanned: users.length, deepScan })
}

import { createServiceClient } from '@/lib/supabase/service'
import { scanUserInbox } from '@/lib/scan-emails'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const deepScan = body.deepScan === true
  const clearHistory = body.clearHistory === true
  console.log(`[trigger] manual scan started deepScan=${deepScan} clearHistory=${clearHistory}`)

  const supabase = createServiceClient()

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('gmail_connected', true)

  if (!users?.length) {
    console.log(`[trigger] no connected inboxes found`)
    return NextResponse.json({ message: 'No connected inboxes' })
  }

  if (clearHistory) {
    const userIds = users.map(u => u.id)
    const { error, count } = await supabase
      .from('email_scans')
      .delete()
      .in('user_id', userIds)
    console.log(`[trigger] cleared email_scans for ${userIds.length} user(s) — rows deleted: ${count} error: ${error?.message ?? 'none'}`)
  }

  console.log(`[trigger] scanning ${users.length} connected inbox(es)`)
  await Promise.all(users.map(u => scanUserInbox(u.id, deepScan)))
  console.log(`[trigger] all scans complete`)

  return NextResponse.json({ success: true, scanned: users.length, deepScan, clearHistory })
}

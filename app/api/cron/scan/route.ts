import { createServiceClient } from '@/lib/supabase/service'
import { scanUserInbox } from '@/lib/scan-emails'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('gmail_connected', true)

  if (!users?.length) {
    return NextResponse.json({ message: 'No connected inboxes' })
  }

  await Promise.all(users.map(u => scanUserInbox(u.id)))

  return NextResponse.json({ success: true, scanned: users.length })
}

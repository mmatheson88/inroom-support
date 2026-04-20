import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const now = new Date()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .lt('resolved_at', prevMonthEnd.toISOString())

  return NextResponse.json({ archived: count ?? 0 })
}

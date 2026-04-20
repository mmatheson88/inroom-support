import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { ids, action } = await request.json()

  if (!ids?.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })

  if (action === 'resolve') {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: existing } = await supabase.from('scan_settings').select('id').single()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('scan_settings')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await supabase
      .from('scan_settings')
      .insert({ ...body, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json({ settings: result })
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { created_by, user_name, ...fields } = body

  // Sanitize empty strings to null for UUID and optional fields
  const sanitized = {
    ...fields,
    facility_id: fields.facility_id || null,
    assigned_to: fields.assigned_to || null,
    created_by: created_by || null,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert(sanitized)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_log').insert({
    ticket_id: ticket.id,
    user_id: created_by || null,
    user_name: user_name ?? 'Unknown',
    action: 'created ticket',
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ ticket })
}

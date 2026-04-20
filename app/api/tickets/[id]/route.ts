import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { userId, userName, ...fields } = body

  const { data: existing } = await supabase.from('tickets').select('*').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() }
  if (fields.status === 'resolved' && existing.status !== 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changedField = Object.keys(fields)[0]
  const { data: activity } = await supabase
    .from('activity_log')
    .insert({
      ticket_id: id,
      user_id: userId,
      user_name: userName,
      action: `changed ${changedField.replace('_', ' ')}`,
      old_value: existing[changedField]?.toString() ?? null,
      new_value: fields[changedField]?.toString() ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  return NextResponse.json({ ticket, activity })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: attachments } = await supabase
    .from('attachments')
    .select('file_url')
    .eq('ticket_id', id)

  if (attachments?.length) {
    const paths = attachments.map(a => {
      const url = new URL(a.file_url)
      return url.pathname.split('/storage/v1/object/public/ticket-attachments/')[1]
    }).filter(Boolean)

    if (paths.length) {
      await supabase.storage.from('ticket-attachments').remove(paths)
    }
  }

  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

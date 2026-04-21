import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { content, userId, userName, parentNoteId } = await request.json()

  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      ticket_id: id,
      user_id: userId,
      user_name: userName,
      content,
      parent_note_id: parentNoteId ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ note })
}

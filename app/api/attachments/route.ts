import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()

  const file = formData.get('file') as File | null
  const ticketId = formData.get('ticketId') as string
  const userId = formData.get('userId') as string
  const description = (formData.get('description') as string | null) ?? ''

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `tickets/${ticketId}/${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('ticket-attachments')
    .upload(path, file)

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: attachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      ticket_id: ticketId,
      file_url: path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      description: description || null,
      uploaded_by: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ attachment })
}

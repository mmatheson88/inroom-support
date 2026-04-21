import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Use service client so signed URL generation works for all authenticated users
  // regardless of who uploaded the file. Auth is enforced by proxy.ts.
  const supabase = createServiceClient()

  const { data: attachment, error } = await supabase
    .from('attachments')
    .select('file_url')
    .eq('id', id)
    .single()

  if (error || !attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  const { data, error: signError } = await supabase.storage
    .from('ticket-attachments')
    .createSignedUrl(attachment.file_url, 120)

  if (signError || !data) {
    return NextResponse.json({ error: signError?.message ?? 'Failed to create signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}

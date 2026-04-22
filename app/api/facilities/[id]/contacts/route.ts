import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facility_contacts')
    .select('*')
    .eq('facility_id', id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Skip duplicate if same email already exists for this facility
  if (body.email) {
    const { data: existing } = await supabase
      .from('facility_contacts')
      .select('id')
      .eq('facility_id', id)
      .eq('email', body.email)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'A contact with this email already exists for this facility' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('facility_contacts')
    .insert({ ...body, facility_id: id, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { contactId } = await request.json()
  const { error } = await supabase.from('facility_contacts').delete().eq('id', contactId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

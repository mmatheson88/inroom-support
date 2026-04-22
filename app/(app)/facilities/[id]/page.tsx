import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FacilityDetail from './facility-detail'

export default async function FacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: facility },
    { data: tickets },
    { data: contacts },
  ] = await Promise.all([
    supabase.from('facilities').select('*').eq('id', id).single(),
    supabase
      .from('tickets')
      .select('id, title, type, priority, status, created_at, assigned_to')
      .eq('facility_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('facility_contacts')
      .select('*')
      .eq('facility_id', id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  if (!facility) notFound()

  return (
    <FacilityDetail
      facility={facility}
      tickets={tickets ?? []}
      contacts={contacts ?? []}
    />
  )
}

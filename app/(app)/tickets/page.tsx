import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/topbar'
import Link from 'next/link'
import TicketsClient from './tickets-client'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tickets')
    .select('id, title, facility_name, facility_location, type, priority, status, assigned_to, created_at, source, resolved_at')
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.source) query = query.eq('source', params.source)
  if (params.assigned) query = query.eq('assigned_to', params.assigned)

  const [{ data: tickets }, { data: users }] = await Promise.all([
    query,
    supabase.from('users').select('id, name, avatar_color'),
  ])

  const title =
    params.status === 'open' ? 'Open Tickets' :
    params.status === 'in_progress' ? 'In Progress' :
    params.status === 'resolved' ? 'Resolved Tickets' :
    params.assigned ? 'My Tickets' :
    'All Tickets'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={title}>
        <Link
          href="/tickets/new"
          style={{
            background: '#E85D26',
            color: '#fff',
            borderRadius: 6,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          + New Ticket
        </Link>
      </Topbar>

      <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
        <TicketsClient
          tickets={tickets ?? []}
          users={users ?? []}
          initialStatus={params.status}
          initialSource={params.source}
        />
      </div>
    </div>
  )
}

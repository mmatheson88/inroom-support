import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/topbar'
import InboxConnectClient from './inbox-connect-client'

export default async function InboxConnectPage() {
  const supabase = await createClient()

  const [{ data: users }, { data: scanSettings }, { data: { user } }] = await Promise.all([
    supabase.from('users').select('id, name, email, role, avatar_color, gmail_connected, last_scan_at').order('name'),
    supabase.from('scan_settings').select('*').single(),
    supabase.auth.getUser(),
  ])

  const { count: scansCount } = await supabase
    .from('email_scans')
    .select('*', { count: 'exact', head: true })

  const { count: ticketsCreated } = await supabase
    .from('email_scans')
    .select('*', { count: 'exact', head: true })
    .eq('ticket_created', true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Inbox Connect" />
      <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
        <InboxConnectClient
          users={users ?? []}
          scanSettings={scanSettings}
          currentUserId={user?.id ?? ''}
          scansTotal={scansCount ?? 0}
          ticketsCreated={ticketsCreated ?? 0}
        />
      </div>
    </div>
  )
}

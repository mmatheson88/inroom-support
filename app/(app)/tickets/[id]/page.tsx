import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TicketDetail from './ticket-detail'

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: ticket },
    { data: notes },
    { data: attachments },
    { data: activity },
    { data: users },
    { data: currentUser },
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('notes')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('attachments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('activity_log')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('users').select('id, name, avatar_color, role'),
    supabase.auth.getUser(),
  ])

  if (!ticket) notFound()

  const profile = currentUser.user
    ? users?.find(u => u.id === currentUser.user!.id)
    : null

  return (
    <TicketDetail
      ticket={ticket}
      notes={notes ?? []}
      attachments={attachments ?? []}
      activity={activity ?? []}
      users={users ?? []}
      currentUserId={currentUser.user?.id ?? ''}
      currentUserName={profile?.name ?? currentUser.user?.email ?? 'Unknown'}
      currentUserRole={profile?.role ?? 'member'}
    />
  )
}

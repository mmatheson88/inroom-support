import { createClient } from '@/lib/supabase/server'
import NewTicketForm from './new-ticket-form'

export default async function NewTicketPage() {
  const supabase = await createClient()

  const [{ data: users }, { data: facilities }, { data: { user } }] = await Promise.all([
    supabase.from('users').select('id, name, avatar_color'),
    supabase.from('facilities').select('id, name, location, address, contact_name, contact_email').order('name'),
    supabase.auth.getUser(),
  ])

  const { data: profile } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <NewTicketForm
      users={users ?? []}
      facilities={facilities ?? []}
      currentUserId={user?.id ?? ''}
      currentUserName={profile?.name ?? user?.email ?? 'Unknown'}
    />
  )
}

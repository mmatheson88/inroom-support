import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/topbar'
import ReviewQueueClient from './review-queue-client'

export default async function ReviewQueuePage() {
  const supabase = await createClient()

  const { data: queue } = await supabase
    .from('review_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, location, contact_name, contact_email')
    .order('name')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('name').eq('id', user?.id ?? '').single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Review Queue">
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {queue?.length ?? 0} pending review
        </span>
      </Topbar>
      <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
        <ReviewQueueClient
          items={queue ?? []}
          facilities={facilities ?? []}
          currentUserId={user?.id ?? ''}
          currentUserName={profile?.name ?? user?.email ?? 'Unknown'}
        />
      </div>
    </div>
  )
}

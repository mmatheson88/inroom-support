import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { ToastProvider } from '@/components/toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role, avatar_color')
    .eq('id', user.id)
    .single()

  const { count: openCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  const { count: inProgressCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress')

  const { count: pendingCount } = await supabase
    .from('review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          user={{
            id: user.id,
            name: profile?.name ?? user.email ?? 'User',
            email: user.email ?? '',
            role: profile?.role ?? 'member',
            avatarColor: profile?.avatar_color ?? '#E85D26',
          }}
          counts={{
            open: openCount ?? 0,
            inProgress: inProgressCount ?? 0,
            pending: pendingCount ?? 0,
          }}
        />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--color-background-tertiary)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}

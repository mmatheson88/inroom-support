import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/topbar'
import Link from 'next/link'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalOpen },
    { count: totalInProgress },
    { count: resolvedThisMonth },
    { count: autoDetected },
    { data: tickets },
    { data: users },
  ] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('resolved_at', monthStart),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'auto_email'),
    supabase
      .from('tickets')
      .select('id, title, facility_name, type, priority, status, assigned_to, created_at, source')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('users').select('id, name, avatar_color'),
  ])

  const stats = {
    totalOpen: totalOpen ?? 0,
    totalInProgress: totalInProgress ?? 0,
    resolvedThisMonth: resolvedThisMonth ?? 0,
    autoDetected: autoDetected ?? 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Dashboard">
        <Link
          href="/tickets/new"
          style={{
            background: '#E85D26',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          + New Ticket
        </Link>
      </Topbar>

      <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <StatCard
            label="Total Open"
            value={stats.totalOpen}
            sub="Active tickets"
            dotColor="#E85D26"
            href="/tickets?status=open"
          />
          <StatCard
            label="In Progress"
            value={stats.totalInProgress}
            sub="Being worked on"
            dotColor="#BA7517"
            href="/tickets?status=in_progress"
          />
          <StatCard
            label="Resolved This Month"
            value={stats.resolvedThisMonth}
            sub="This calendar month"
            dotColor="#1D9E75"
            href="/tickets?status=resolved"
          />
          <StatCard
            label="Auto-Detected"
            value={stats.autoDetected}
            sub="From email scanning"
            dotColor="#0C447C"
            href="/tickets?source=auto_email"
          />
        </div>

        <DashboardClient tickets={tickets ?? []} users={users ?? []} />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  dotColor,
  href,
}: {
  label: string
  value: number
  sub: string
  dotColor: string
  href: string
}) {
  return (
    <Link
      href={href}
      style={{
        background: 'white',
        border: '0.5px solid var(--color-border-primary)',
        borderRadius: 8,
        padding: '10px 12px',
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'block',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
        {sub}
      </div>
    </Link>
  )
}

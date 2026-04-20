import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/topbar'
import { formatDate } from '@/lib/tokens'

export default async function ReportsPage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: allTickets },
    { data: thisMonthTickets },
    { data: users },
  ] = await Promise.all([
    supabase.from('tickets').select('id, type, priority, status, assigned_to, created_at, resolved_at, source'),
    supabase.from('tickets').select('id, type, priority, status, assigned_to, created_at, resolved_at').gte('created_at', monthStart),
    supabase.from('users').select('id, name, avatar_color'),
  ])

  const tickets = allTickets ?? []
  const monthTickets = thisMonthTickets ?? []

  const byType = countBy(monthTickets, 'type')
  const byPriority = countBy(monthTickets, 'priority')
  const byStatus = countBy(monthTickets, 'status')

  const resolved = tickets.filter(t => t.status === 'resolved' && t.resolved_at)
  const avgResolutionMs = resolved.length
    ? resolved.reduce((sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length
    : 0
  const avgResolutionDays = Math.round(avgResolutionMs / (1000 * 60 * 60 * 24))

  const byAssignee = users?.map(u => ({
    user: u,
    open: tickets.filter(t => t.assigned_to === u.id && t.status === 'open').length,
    inProgress: tickets.filter(t => t.assigned_to === u.id && t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.assigned_to === u.id && t.status === 'resolved').length,
  })) ?? []

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Reports">
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{monthLabel}</span>
      </Topbar>

      <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <MiniStat label="Created This Month" value={monthTickets.length} />
          <MiniStat label="Resolved This Month" value={monthTickets.filter(t => t.status === 'resolved').length} />
          <MiniStat label="Avg Resolution Time" value={`${avgResolutionDays}d`} />
          <MiniStat label="Auto-Detected" value={tickets.filter(t => t.source === 'auto_email').length} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <ReportCard title="Tickets by Type (This Month)">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <BarRow key={type} label={type} count={count} total={monthTickets.length} />
            ))}
          </ReportCard>

          <ReportCard title="Tickets by Priority (This Month)">
            {Object.entries(byPriority).sort((a, b) => b[1] - a[1]).map(([p, count]) => (
              <BarRow key={p} label={p} count={count} total={monthTickets.length} />
            ))}
          </ReportCard>
        </div>

        <ReportCard title="By Assignee (All Time)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', padding: '0 0 8px' }}>Team Member</div>
            {['Open', 'In Progress', 'Resolved'].map(h => (
              <div key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', padding: '0 0 8px', textAlign: 'center' }}>{h}</div>
            ))}
          </div>
          {byAssignee.map(({ user, open, inProgress, resolved }) => (
            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0, alignItems: 'center', padding: '6px 0', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: user.avatar_color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 600,
                  }}
                >
                  {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#0C447C', fontWeight: 500 }}>{open}</div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#633806', fontWeight: 500 }}>{inProgress}</div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#27500A', fontWeight: 500 }}>{resolved}</div>
            </div>
          ))}
        </ReportCard>
      </div>
    </div>
  )
}

function countBy(arr: Record<string, unknown>[], key: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of arr) {
    const val = String(item[key] ?? 'unknown')
    result[val] = (result[val] ?? 0) + 1
  }
  return result
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid var(--color-border-primary)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid var(--color-border-primary)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 12, color: 'var(--color-text-primary)' }}>{title}</div>
      {children}
    </div>
  )
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 80, fontSize: 11, textTransform: 'capitalize', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: 'var(--color-background-secondary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#0C447C', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ width: 28, fontSize: 11, fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>{count}</div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/badge'
import { daysOpen as daysOpenColor, formatDate } from '@/lib/tokens'

interface Ticket {
  id: string
  title: string
  facility_name: string
  type: string
  priority: string
  status: string
  assigned_to: string | null
  created_at: string
  source: string
}

interface User {
  id: string
  name: string
  avatar_color: string
}

function getDaysOpen(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

function Avatar({ user }: { user: User }) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: user.avatar_color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        color: '#fff',
        fontWeight: 600,
        flexShrink: 0,
      }}
      title={user.name}
    >
      {initials}
    </div>
  )
}

export default function DashboardClient({ tickets, users }: { tickets: Ticket[]; users: User[] }) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users])

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.facility_name?.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && t.type !== typeFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (assigneeFilter && t.assigned_to !== assigneeFilter) return false
      return true
    })
  }, [tickets, search, typeFilter, priorityFilter, assigneeFilter])

  const open = filtered.filter(t => t.status === 'open')
  const inProgress = filtered.filter(t => t.status === 'in_progress')

  return (
    <>
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            fontSize: 11,
            border: '0.5px solid var(--color-border-primary)',
            borderRadius: 5,
            padding: '5px 8px',
            background: 'white',
            outline: 'none',
          }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 6px', background: 'white' }}
        >
          <option value="">All Types</option>
          <option value="channel">Channel</option>
          <option value="remote">Remote</option>
          <option value="billing">Billing</option>
          <option value="tech">Tech</option>
          <option value="programming">Programming</option>
          <option value="other">Other</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 6px', background: 'white' }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 6px', background: 'white' }}
        >
          <option value="">All Assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: 'var(--color-background-secondary)',
            borderRadius: 6,
            padding: 2,
          }}
        >
          {(['list', 'kanban'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                border: view === v ? '0.5px solid var(--color-border-primary)' : 'none',
                background: view === v ? 'white' : 'transparent',
                fontWeight: view === v ? 500 : 400,
                color: view === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {v === 'list' ? (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 2.5h9M1 5.5h9M1 8.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <rect x="1" y="1" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="6" y="1" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              )}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <TicketTable tickets={filtered} userMap={userMap} onRowClick={id => router.push(`/tickets/${id}`)} />
      ) : (
        <KanbanBoard open={open} inProgress={inProgress} userMap={userMap} onCardClick={id => router.push(`/tickets/${id}`)} />
      )}
    </>
  )
}

function TicketTable({
  tickets,
  userMap,
  onRowClick,
}: {
  tickets: Ticket[]
  userMap: Map<string, User>
  onRowClick: (id: string) => void
}) {
  if (tickets.length === 0) {
    return (
      <div
        style={{
          background: 'white',
          border: '0.5px solid var(--color-border-primary)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          gap: 12,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="19" stroke="var(--color-border-primary)" strokeWidth="1" />
          <path d="M12 16h16M12 22h10" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>No tickets found</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Try adjusting your filters</div>
      </div>
    )
  }

  const colWidths = '52px 1fr 80px 72px 52px 64px 68px'
  const headers = ['#', 'Issue', 'Type', 'Priority', 'Days', 'Assigned', 'Status']

  return (
    <div
      style={{
        background: 'white',
        border: '0.5px solid var(--color-border-primary)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: colWidths,
          background: 'var(--color-background-secondary)',
          padding: '0 10px',
        }}
      >
        {headers.map(h => (
          <div
            key={h}
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-secondary)',
              padding: '8px 4px',
              fontWeight: 500,
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {tickets.map(ticket => {
        const days = getDaysOpen(ticket.created_at)
        const assignee = ticket.assigned_to ? userMap.get(ticket.assigned_to) : null

        return (
          <div
            key={ticket.id}
            onClick={() => onRowClick(ticket.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: colWidths,
              padding: '0 10px',
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              alignItems: 'center',
              cursor: 'pointer',
              minHeight: 44,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-background-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 500, padding: '0 4px' }}>
              #{ticket.id.slice(0, 6)}
            </div>
            <div style={{ padding: '8px 4px', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ticket.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{ticket.facility_name}</div>
            </div>
            <div style={{ padding: '0 4px' }}><TypeBadge value={ticket.type} /></div>
            <div style={{ padding: '0 4px' }}><PriorityBadge value={ticket.priority} /></div>
            <div style={{ padding: '0 4px', fontSize: 11, fontWeight: 500, color: daysOpenColor(days) }}>
              {days}d
            </div>
            <div style={{ padding: '0 4px' }}>
              {assignee ? <Avatar user={assignee} /> : <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>—</span>}
            </div>
            <div style={{ padding: '0 4px' }}><StatusBadge value={ticket.status} /></div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanBoard({
  open,
  inProgress,
  userMap,
  onCardClick,
}: {
  open: Ticket[]
  inProgress: Ticket[]
  userMap: Map<string, User>
  onCardClick: (id: string) => void
}) {
  const columns = [
    { label: 'Open', tickets: open, bg: '#E6F1FB', color: '#0C447C' },
    { label: 'In Progress', tickets: inProgress, bg: '#FAEEDA', color: '#633806' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 12 }}>
      {columns.map(col => (
        <div key={col.label}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
              {col.label}
            </span>
            <span
              style={{
                background: col.bg,
                color: col.color,
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {col.tickets.length}
            </span>
          </div>

          {col.tickets.length === 0 && (
            <div
              style={{
                background: 'white',
                border: '0.5px dashed var(--color-border-primary)',
                borderRadius: 8,
                padding: '24px 12px',
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--color-text-muted)',
              }}
            >
              No tickets
            </div>
          )}

          {col.tickets.map(ticket => {
            const days = getDaysOpen(ticket.created_at)
            const assignee = ticket.assigned_to ? userMap.get(ticket.assigned_to) : null

            return (
              <div
                key={ticket.id}
                onClick={() => onCardClick(ticket.id)}
                style={{
                  background: 'white',
                  border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-primary)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <PriorityBadge value={ticket.priority} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{days}d</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, lineHeight: 1.4 }}>{ticket.title}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{ticket.facility_name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TypeBadge value={ticket.type} />
                  {assignee && <Avatar user={assignee} />}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

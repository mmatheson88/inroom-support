'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/badge'
import { daysOpen as daysOpenColor, formatDate } from '@/lib/tokens'

interface Ticket {
  id: string
  title: string
  facility_name: string
  facility_location: string
  type: string
  priority: string
  status: string
  assigned_to: string | null
  created_at: string
  source: string
  resolved_at: string | null
}

interface User {
  id: string
  name: string
  avatar_color: string
}

function getDaysOpen(ticket: Ticket) {
  const end = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date()
  return Math.floor((end.getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))
}

export default function TicketsClient({
  tickets,
  users,
  initialStatus,
  initialSource,
}: {
  tickets: Ticket[]
  users: User[]
  initialStatus?: string
  initialSource?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? '')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState(initialSource ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Sync local filter state when the URL-driven props change (filter-to-filter navigation)
  useEffect(() => {
    setStatusFilter(initialStatus ?? '')
    setSourceFilter(initialSource ?? '')
    setSearch('')
    setTypeFilter('')
    setPriorityFilter('')
    setAssigneeFilter('')
    setSelected(new Set())
  }, [initialStatus, initialSource])

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users])

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (search) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q) &&
          !t.facility_name?.toLowerCase().includes(q)) return false
      }
      if (statusFilter && t.status !== statusFilter) return false
      if (typeFilter && t.type !== typeFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (assigneeFilter && t.assigned_to !== assigneeFilter) return false
      if (sourceFilter && t.source !== sourceFilter) return false
      return true
    })
  }, [tickets, search, statusFilter, typeFilter, priorityFilter, assigneeFilter, sourceFilter])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t => t.id)))
    }
  }

  const colWidths = '32px 52px 1fr 80px 72px 52px 64px 68px'
  const headers = ['', '#', 'Issue', 'Type', 'Priority', 'Days', 'Assigned', 'Status']

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 160,
            fontSize: 11,
            border: '0.5px solid var(--color-border-primary)',
            borderRadius: 5,
            padding: '5px 8px',
            background: 'white',
            outline: 'none',
          }}
        />
        {[
          {
            value: statusFilter, onChange: setStatusFilter, options: [
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
            ]
          },
          {
            value: typeFilter, onChange: setTypeFilter, options: [
              { value: '', label: 'All Types' },
              { value: 'channel', label: 'Channel' },
              { value: 'remote', label: 'Remote' },
              { value: 'billing', label: 'Billing' },
              { value: 'tech', label: 'Tech' },
              { value: 'programming', label: 'Programming' },
              { value: 'other', label: 'Other' },
            ]
          },
          {
            value: priorityFilter, onChange: setPriorityFilter, options: [
              { value: '', label: 'All Priorities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={e => sel.onChange(e.target.value)}
            style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 6px', background: 'white' }}
          >
            {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 6px', background: 'white' }}
        >
          <option value="">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          style={{
            background: '#E6F1FB',
            border: '0.5px solid #B5D4F4',
            borderRadius: 6,
            padding: '6px 12px',
            marginBottom: 8,
            fontSize: 11,
            color: '#0C447C',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{selected.size} selected</span>
          <BulkActions selected={selected} users={users} onDone={() => { setSelected(new Set()); router.refresh() }} />
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>No tickets found</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Adjust filters or create a new ticket</div>
        </div>
      ) : (
        <div style={{ background: 'white', border: '0.5px solid var(--color-border-primary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: colWidths, background: 'var(--color-background-secondary)', padding: '0 10px' }}>
            <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </div>
            {headers.slice(1).map(h => (
              <div key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', padding: '8px 4px', fontWeight: 500 }}>
                {h}
              </div>
            ))}
          </div>

          {filtered.map(ticket => {
            const days = getDaysOpen(ticket)
            const assignee = ticket.assigned_to ? userMap.get(ticket.assigned_to) : null
            const isSelected = selected.has(ticket.id)

            return (
              <div
                key={ticket.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: colWidths,
                  padding: '0 10px',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  alignItems: 'center',
                  minHeight: 44,
                  background: isSelected ? '#F0F7FF' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-background-secondary)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }} onClick={e => { e.stopPropagation(); toggleSelect(ticket.id) }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ticket.id)} style={{ cursor: 'pointer' }} />
                </div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 500, padding: '0 4px' }}>
                  #{ticket.id.slice(0, 6)}
                </div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '8px 4px', minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{ticket.facility_name}</div>
                </div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '0 4px' }}><TypeBadge value={ticket.type} /></div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '0 4px' }}><PriorityBadge value={ticket.priority} /></div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '0 4px', fontSize: 11, fontWeight: 500, color: daysOpenColor(days) }}>{days}d</div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '0 4px' }}>
                  {assignee ? (
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: '50%', background: assignee.avatar_color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 600,
                      }}
                      title={assignee.name}
                    >
                      {assignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ) : <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>—</span>}
                </div>
                <div onClick={() => router.push(`/tickets/${ticket.id}`)} style={{ padding: '0 4px' }}><StatusBadge value={ticket.status} /></div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function BulkActions({ selected, users, onDone }: { selected: Set<string>; users: User[]; onDone: () => void }) {
  const [loading, setLoading] = useState(false)

  async function bulkResolve() {
    setLoading(true)
    const res = await fetch('/api/tickets/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], action: 'resolve' }),
    })
    setLoading(false)
    if (res.ok) onDone()
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={bulkResolve}
        disabled={loading}
        style={{
          background: '#639922',
          color: '#fff',
          border: 'none',
          borderRadius: 5,
          padding: '4px 10px',
          fontSize: 11,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Resolving...' : 'Mark Resolved'}
      </button>
    </div>
  )
}

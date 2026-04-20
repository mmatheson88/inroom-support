'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PriorityBadge, TypeBadge } from '@/components/badge'
import { formatDate } from '@/lib/tokens'
import { useToast } from '@/components/toast'

interface QueueItem {
  id: string
  user_id: string
  gmail_message_id: string
  from_email: string
  subject: string
  summary: string
  suggested_facility: string
  suggested_type: string
  suggested_priority: string
  confidence_score: number
  status: string
  created_at: string
}

interface Facility {
  id: string
  name: string
  location: string
  contact_name: string
  contact_email: string
}

export default function ReviewQueueClient({
  items: initialItems,
  facilities,
  currentUserId,
  currentUserName,
}: {
  items: QueueItem[]
  facilities: Facility[]
  currentUserId: string
  currentUserName: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState(initialItems)
  const [processing, setProcessing] = useState<string | null>(null)

  async function approve(item: QueueItem) {
    setProcessing(item.id)

    const facility = facilities.find(f => f.name.toLowerCase().includes(item.suggested_facility?.toLowerCase() ?? ''))

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.subject,
        description: item.summary,
        facility_id: facility?.id ?? '',
        facility_name: item.suggested_facility || facility?.name || 'Unknown',
        facility_location: facility?.location ?? '',
        contact_name: facility?.contact_name ?? '',
        contact_email: facility?.contact_email ?? item.from_email,
        type: item.suggested_type || 'other',
        priority: item.suggested_priority || 'medium',
        source: 'auto_email',
        status: 'open',
        created_by: currentUserId,
      }),
    })

    if (res.ok) {
      await fetch(`/api/review-queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast('Ticket created from email')
      router.refresh()
    } else {
      toast('Failed to create ticket', 'error')
    }

    setProcessing(null)
  }

  async function dismiss(item: QueueItem) {
    setProcessing(item.id)
    const res = await fetch(`/api/review-queue/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    })

    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast('Item dismissed')
    }
    setProcessing(null)
  }

  if (items.length === 0) {
    return (
      <div
        style={{
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
          <path d="M14 20l4 4 8-8" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>All caught up!</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>No emails pending review</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Info banner */}
      <div
        style={{
          background: '#E6F1FB',
          border: '0.5px solid #B5D4F4',
          borderRadius: 8,
          padding: '11px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 4,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="7" stroke="#0C447C" strokeWidth="1" />
          <path d="M8 7v5M8 5v1" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 12, color: '#0C447C', margin: 0, lineHeight: 1.5 }}>
          These emails were detected as potential support issues by the AI scanner. Review and approve to create a ticket, or dismiss if not relevant.
        </p>
      </div>

      {items.map(item => (
        <div
          key={item.id}
          style={{
            background: 'white',
            border: '0.5px solid var(--color-border-primary)',
            borderRadius: 8,
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{item.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>From: {item.from_email}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <ConfidencePill score={item.confidence_score} />
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{formatDate(item.created_at)}</span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 12px', padding: '8px 10px', background: 'var(--color-background-secondary)', borderRadius: 5 }}>
            {item.summary}
          </p>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Suggested:</span>
            {item.suggested_facility && (
              <span style={{ fontSize: 10, background: '#E6F1FB', color: '#0C447C', padding: '2px 6px', borderRadius: 4 }}>
                {item.suggested_facility}
              </span>
            )}
            {item.suggested_type && <TypeBadge value={item.suggested_type} />}
            {item.suggested_priority && <PriorityBadge value={item.suggested_priority} />}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => approve(item)}
              disabled={processing === item.id}
              style={{
                background: '#1D9E75',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 500,
                cursor: processing === item.id ? 'default' : 'pointer',
                opacity: processing === item.id ? 0.7 : 1,
              }}
            >
              {processing === item.id ? 'Creating...' : 'Approve & Create Ticket'}
            </button>
            <button
              onClick={() => dismiss(item)}
              disabled={processing === item.id}
              style={{
                background: 'none',
                border: '0.5px solid var(--color-border-primary)',
                borderRadius: 5,
                padding: '6px 14px',
                fontSize: 11,
                cursor: processing === item.id ? 'default' : 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConfidencePill({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 85 ? '#1D9E75' : pct >= 60 ? '#BA7517' : '#A32D2D'
  const bg = pct >= 85 ? '#EAF3DE' : pct >= 60 ? '#FAEEDA' : '#FCEBEB'
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4 }}>
      {pct}% confidence
    </span>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { priority as priorityTokens } from '@/lib/tokens'
import { useToast } from '@/components/toast'

interface User { id: string; name: string; avatar_color: string }
interface Facility { id: string; name: string; location: string; contact_name: string; contact_email: string }

const SOURCES = ['manual', 'phone', 'email', 'in_person'] as const
const TYPES = ['channel', 'remote', 'billing', 'tech', 'programming', 'other'] as const
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

export default function NewTicketForm({
  users,
  facilities,
  currentUserId,
  currentUserName,
}: {
  users: User[]
  facilities: Facility[]
  currentUserId: string
  currentUserName: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    facility_id: '',
    facility_name: '',
    facility_location: '',
    contact_name: '',
    contact_email: '',
    type: 'tech' as typeof TYPES[number],
    priority: 'medium' as typeof PRIORITIES[number],
    source: 'manual' as typeof SOURCES[number],
    assigned_to: '',
  })

  const [facilitySearch, setFacilitySearch] = useState('')
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false)
  const facilityRef = useRef<HTMLDivElement>(null)

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(facilitySearch.toLowerCase())
  )

  function selectFacility(f: Facility) {
    setForm(prev => ({
      ...prev,
      facility_id: f.id,
      facility_name: f.name,
      facility_location: f.location,
      contact_name: prev.contact_name || f.contact_name,
      contact_email: prev.contact_email || f.contact_email,
    }))
    setFacilitySearch(f.name)
    setShowFacilityDropdown(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (facilityRef.current && !facilityRef.current.contains(e.target as Node)) {
        setShowFacilityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const allowed = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']
    const maxSize = 10 * 1024 * 1024
    const newFiles: File[] = []
    for (const file of Array.from(fileList)) {
      if (!allowed.includes(file.type)) { toast(`${file.name}: file type not allowed`, 'error'); continue }
      if (file.size > maxSize) { toast(`${file.name}: exceeds 10MB limit`, 'error'); continue }
      newFiles.push(file)
    }
    setPendingFiles(prev => [...prev, ...newFiles])
  }

  function removeFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.facility_name.trim()) return

    setSubmitting(true)
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, created_by: currentUserId, user_name: currentUserName }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast(err.error ?? 'Failed to create ticket', 'error')
      setSubmitting(false)
      return
    }

    const { ticket } = await res.json()

    // Upload any pending attachments
    for (const file of pendingFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ticketId', ticket.id)
      fd.append('userId', currentUserId)
      await fetch('/api/attachments', { method: 'POST', body: fd })
    }

    toast('Ticket created')
    router.push(`/tickets/${ticket.id}`)
  }

  const inputStyle = {
    fontSize: 12,
    border: '0.5px solid var(--color-border-primary)',
    borderRadius: 6,
    padding: '7px 10px',
    width: '100%',
    outline: 'none',
    background: 'white',
  } as const

  const labelStyle = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    display: 'block',
    marginBottom: 5,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div
        style={{
          background: 'white',
          height: 48,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '4px 8px',
            background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Back
        </button>
        <h1 style={{ fontSize: 14, fontWeight: 500, flex: 1, margin: 0 }}>New Ticket</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', maxWidth: 780, flex: 1 }}>

          {/* 1. Facility & Contact */}
          <Section title="Facility & Contact" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div ref={facilityRef} style={{ position: 'relative' }}>
              <label style={labelStyle}>Facility <span style={{ color: '#E85D26' }}>*</span></label>
              <input
                required
                value={facilitySearch}
                onChange={e => {
                  setFacilitySearch(e.target.value)
                  setForm(p => ({ ...p, facility_name: e.target.value, facility_id: '' }))
                  setShowFacilityDropdown(true)
                }}
                onFocus={() => setShowFacilityDropdown(true)}
                placeholder="Search or enter facility name"
                style={inputStyle}
              />
              {showFacilityDropdown && filteredFacilities.length > 0 && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'white', border: '0.5px solid var(--color-border-primary)',
                    borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 2,
                  }}
                >
                  {filteredFacilities.map(f => (
                    <div
                      key={f.id}
                      onMouseDown={() => selectFacility(f)}
                      style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', borderBottom: '0.5px solid var(--color-border-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-background-secondary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                    >
                      <div style={{ fontWeight: 500 }}>{f.name}</div>
                      {f.location && <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{f.location}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                value={form.facility_location}
                onChange={e => setForm(p => ({ ...p, facility_location: e.target.value }))}
                placeholder="City, State"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input
                value={form.contact_name}
                onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                placeholder="Contact person"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                placeholder="contact@facility.com"
                style={inputStyle}
              />
            </div>
          </div>

          {/* 2. Issue Details */}
          <Section title="Issue Details" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title <span style={{ color: '#E85D26' }}>*</span></label>
              <input
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Brief description of the issue"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Additional details about the issue..."
                style={{ ...inputStyle, height: 80, resize: 'none', lineHeight: 1.5 }}
              />
            </div>
          </div>

          {/* 3. Classification */}
          <Section title="Classification" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Issue Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as typeof TYPES[number] }))}
                style={inputStyle}
              >
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assigned To</label>
              <select
                value={form.assigned_to}
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* 4. Priority */}
          <Section title="Priority" />
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PRIORITIES.map(p => {
                const colors = priorityTokens[p]
                const active = form.priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    style={{
                      border: active ? `1.5px solid ${colors.border}` : '0.5px solid var(--color-border-primary)',
                      borderRadius: 6,
                      padding: '10px 6px',
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 500,
                      background: active ? colors.bg : 'white',
                      color: active ? colors.text : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.1s',
                      userSelect: 'none',
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. Source */}
          <Section title="Source" />
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SOURCES.map(s => {
                const active = form.source === s
                const label = s === 'in_person' ? 'In Person' : s.charAt(0).toUpperCase() + s.slice(1)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, source: s }))}
                    style={{
                      border: active ? '0.5px solid #B5D4F4' : '0.5px solid var(--color-border-primary)',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 11,
                      background: active ? '#E6F1FB' : 'white',
                      color: active ? '#0C447C' : 'var(--color-text-secondary)',
                      fontWeight: active ? 500 : 400,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 6. Attachments */}
          <Section title="Attachments (Optional)" />
          <div style={{ marginBottom: 20 }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.mp4"
              style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)}
            />

            {pendingFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '0.5px dashed var(--color-border-primary)',
                  borderRadius: 6,
                  background: 'var(--color-background-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Click to attach files
                <span style={{ fontSize: 10, opacity: 0.7 }}>JPG, PNG, PDF, MP4 — max 10MB each</span>
              </button>
            ) : (
              <div>
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px',
                      border: '0.5px solid var(--color-border-primary)',
                      borderRadius: 6,
                      marginBottom: 6,
                      background: 'white',
                      fontSize: 12,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="1" width="10" height="12" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1" />
                      <path d="M4 5h6M4 7h6M4 9h4" stroke="var(--color-text-secondary)" strokeWidth="0.8" strokeLinecap="round" />
                    </svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontSize: 11, color: '#0C447C', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
                  }}
                >
                  + Add more files
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: 'white',
            borderTop: '0.5px solid var(--color-border-tertiary)',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Fields marked with * are required
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                background: 'none', border: '0.5px solid var(--color-border-primary)',
                borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#E85D26', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 20px', fontSize: 12, fontWeight: 500,
                cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: '0.5px solid var(--color-border-primary)',
        paddingBottom: 8, marginBottom: 14,
        color: 'var(--color-text-secondary)', fontWeight: 500,
      }}
    >
      {title}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/badge'
import { daysOpen as daysOpenColor, formatDate, status as statusTokens } from '@/lib/tokens'
import { useToast } from '@/components/toast'

interface Ticket {
  id: string
  title: string
  description: string
  facility_id: string | null
  facility_name: string
  facility_location: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  type: string
  priority: string
  status: string
  assigned_to: string | null
  source: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  created_by: string
}

interface FacilityOption {
  id: string
  name: string
  address: string | null
}

interface Note {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  parent_note_id: string | null
}

interface Attachment {
  id: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  description: string | null
  uploaded_by: string
  created_at: string
}

interface ActivityEntry {
  id: string
  user_name: string
  action: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

interface User {
  id: string
  name: string
  avatar_color: string
  role: string
}

function getDaysOpen(ticket: Ticket) {
  const end = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date()
  return Math.floor((end.getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TicketDetail({
  ticket: initialTicket,
  notes: initialNotes,
  attachments: initialAttachments,
  activity: initialActivity,
  users,
  currentUserId,
  currentUserName,
  currentUserRole,
}: {
  ticket: Ticket
  notes: Note[]
  attachments: Attachment[]
  activity: ActivityEntry[]
  users: User[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [ticket, setTicket] = useState(initialTicket)
  const [notes, setNotes] = useState(initialNotes)
  const [attachments, setAttachments] = useState(initialAttachments)
  const [activity, setActivity] = useState(initialActivity)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [savingReply, setSavingReply] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [attachDescription, setAttachDescription] = useState('')
  const [showAttachForm, setShowAttachForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Facility linking
  const [allFacilities, setAllFacilities] = useState<FacilityOption[]>([])
  const [facilitySearch, setFacilitySearch] = useState('')
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false)
  const [linkingFacility, setLinkingFacility] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const facilityDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (facilityDropdownRef.current && !facilityDropdownRef.current.contains(e.target as Node)) {
        setShowFacilityDropdown(false)
      }
    }
    if (showFacilityDropdown) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFacilityDropdown])

  const days = getDaysOpen(ticket)
  const userMap = new Map(users.map(u => [u.id, u]))

  // Build note tree: top-level notes with their replies
  const topLevelNotes = notes.filter(n => !n.parent_note_id)
  const repliesFor = (noteId: string) => notes.filter(n => n.parent_note_id === noteId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  async function openFacilitySearch() {
    if (allFacilities.length === 0) {
      const res = await fetch('/api/facilities')
      if (res.ok) {
        const { facilities } = await res.json()
        setAllFacilities(facilities)
      }
    }
    setFacilitySearch('')
    setShowFacilityDropdown(true)
  }

  async function linkFacility(f: FacilityOption) {
    setShowFacilityDropdown(false)
    setLinkingFacility(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_id: f.id, facility_name: f.name, userId: currentUserId, userName: currentUserName }),
    })
    setLinkingFacility(false)
    if (res.ok) {
      const updated = await res.json()
      setTicket(updated.ticket)
      setActivity(prev => [updated.activity, ...prev])
      toast(`Linked to ${f.name}`)
    } else {
      toast('Failed to link facility', 'error')
    }
  }

  async function saveContactToFacility() {
    if (!ticket.facility_id) return
    setSavingContact(true)
    // Check for duplicate by email first
    const res = await fetch(`/api/facilities/${ticket.facility_id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: ticket.contact_name,
        email: ticket.contact_email || null,
        phone: ticket.contact_phone || null,
        role: null,
        is_primary: false,
      }),
    })
    setSavingContact(false)
    if (res.ok) {
      toast('Contact saved to facility')
    } else {
      const err = await res.json()
      toast(err.error ?? 'Failed to save contact', 'error')
    }
  }

  async function updateField(field: string, value: string) {
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value, userId: currentUserId, userName: currentUserName }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTicket(updated.ticket)
      setActivity(prev => [updated.activity, ...prev])
      toast(`${field.replace('_', ' ')} updated`)
    } else {
      const err = await res.json().catch(() => ({}))
      toast(err.error ?? `Failed to update ${field.replace('_', ' ')}`, 'error')
    }
  }

  async function submitNote(content: string, parentNoteId: string | null = null) {
    if (!content.trim()) return
    if (parentNoteId) setSavingReply(true)
    else setSavingNote(true)

    const res = await fetch(`/api/tickets/${ticket.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, userId: currentUserId, userName: currentUserName, parentNoteId }),
    })

    if (parentNoteId) setSavingReply(false)
    else setSavingNote(false)

    if (res.ok) {
      const { note } = await res.json()
      setNotes(prev => [...prev, note])
      if (parentNoteId) {
        setReplyingTo(null)
        setReplyText('')
      } else {
        setNoteText('')
      }
      toast('Note saved')
    }
  }

  async function markResolved() {
    setResolving(true)
    await updateField('status', 'resolved')
    setResolving(false)
    toast('Ticket resolved')
  }

  async function deleteTicket() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      toast('Ticket deleted')
      router.push('/tickets')
    }
  }

  async function uploadFile(file: File) {
    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('ticketId', ticket.id)
    formData.append('userId', currentUserId)
    formData.append('description', attachDescription)
    const res = await fetch('/api/attachments', { method: 'POST', body: formData })
    setUploadingFile(false)
    if (res.ok) {
      const { attachment } = await res.json()
      setAttachments(prev => [attachment, ...prev])
      setAttachDescription('')
      setShowAttachForm(false)
      toast('File uploaded')
    } else {
      toast('Upload failed', 'error')
    }
  }

  const daysColor = daysOpenColor(days)
  const statusColors = statusTokens[ticket.status as keyof typeof statusTokens] ?? statusTokens.open

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
            border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
            padding: '4px 8px', background: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)', flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Back
        </button>

        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500, flexShrink: 0 }}>
          #{ticket.id.slice(0, 8)}
        </span>

        <h1
          style={{
            fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
          }}
        >
          {ticket.title}
        </h1>

        <span
          style={{
            background: daysColor === '#3B6D11' ? '#EAF3DE' : daysColor === '#BA7517' ? '#FAEEDA' : '#FCEBEB',
            color: daysColor, fontSize: 10, padding: '2px 8px',
            borderRadius: 4, flexShrink: 0, fontWeight: 500,
          }}
        >
          {days}d open
        </span>

        <select
          value={ticket.status}
          onChange={e => updateField('status', e.target.value)}
          style={{
            fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
            padding: '4px 6px', background: statusColors.bg, color: statusColors.text,
            flexShrink: 0, cursor: 'pointer',
          }}
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        {ticket.status !== 'resolved' && (
          <button
            onClick={markResolved}
            disabled={resolving}
            style={{
              background: '#639922', color: '#fff', border: 'none', borderRadius: 5,
              fontSize: 11, fontWeight: 500, padding: '5px 12px',
              cursor: resolving ? 'default' : 'pointer', flexShrink: 0, opacity: resolving ? 0.7 : 1,
            }}
          >
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}

        {currentUserRole === 'admin' && (
          <button
            onClick={deleteTicket}
            disabled={deleting}
            style={{
              background: 'none', border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
              fontSize: 11, padding: '4px 10px', cursor: deleting ? 'default' : 'pointer',
              color: 'var(--color-text-secondary)', flexShrink: 0,
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {/* Issue card */}
          <div
            style={{
              background: 'white', border: '0.5px solid var(--color-border-primary)',
              borderRadius: 8, padding: '11px 13px', marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 7 }}>
              Issue
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>{ticket.title}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <StatusBadge value={ticket.status} />
              <PriorityBadge value={ticket.priority} />
              <TypeBadge value={ticket.type} />
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                via {ticket.source.replace('_', ' ')}
              </span>
            </div>
            {ticket.description && (
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </p>
            )}
          </div>

          {/* Notes */}
          <div
            style={{
              background: 'white', border: '0.5px solid var(--color-border-primary)',
              borderRadius: 8, padding: '11px 13px', marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Notes ({notes.length})
            </div>

            {topLevelNotes.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>No notes yet.</div>
            )}

            {topLevelNotes.map(note => {
              const replies = repliesFor(note.id)
              return (
                <div key={note.id} style={{ marginBottom: 12 }}>
                  <NoteItem
                    note={note}
                    userMap={userMap}
                    onReply={() => {
                      setReplyingTo(replyingTo === note.id ? null : note.id)
                      setReplyText('')
                    }}
                    isReplying={replyingTo === note.id}
                  />

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div style={{ marginLeft: 32, marginTop: 6, borderLeft: '2px solid var(--color-border-tertiary)', paddingLeft: 10 }}>
                      {replies.map(reply => (
                        <div key={reply.id} style={{ marginBottom: 8 }}>
                          <NoteItem note={reply} userMap={userMap} isReply />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === note.id && (
                    <div style={{ marginLeft: 32, marginTop: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={`Reply to ${note.user_name}...`}
                        autoFocus
                        rows={2}
                        style={{
                          flex: 1, fontSize: 11, border: '0.5px solid var(--color-border-primary)',
                          borderRadius: 5, padding: '6px 8px', resize: 'none', outline: 'none', lineHeight: 1.5,
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitNote(replyText, note.id) }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          onClick={() => submitNote(replyText, note.id)}
                          disabled={savingReply || !replyText.trim()}
                          style={{
                            background: '#0C447C', color: '#fff', border: 'none', borderRadius: 5,
                            fontSize: 11, fontWeight: 500, padding: '5px 10px', cursor: savingReply || !replyText.trim() ? 'default' : 'pointer',
                            opacity: savingReply || !replyText.trim() ? 0.6 : 1,
                          }}
                        >
                          {savingReply ? '...' : 'Reply'}
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText('') }}
                          style={{
                            background: 'none', border: '0.5px solid var(--color-border-primary)',
                            borderRadius: 5, fontSize: 11, padding: '5px 10px', cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* New note */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                style={{
                  flex: 1, fontSize: 11, border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 5, padding: '6px 8px', resize: 'none', outline: 'none', lineHeight: 1.5, height: 34,
                }}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitNote(noteText) }}
              />
              <button
                onClick={() => submitNote(noteText)}
                disabled={savingNote || !noteText.trim()}
                style={{
                  background: '#0C447C', color: '#fff', border: 'none', borderRadius: 5,
                  fontSize: 11, fontWeight: 500, padding: '6px 12px',
                  cursor: savingNote || !noteText.trim() ? 'default' : 'pointer',
                  opacity: savingNote || !noteText.trim() ? 0.6 : 1, height: 34, flexShrink: 0,
                }}
              >
                {savingNote ? '...' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div
            style={{
              background: 'white', border: '0.5px solid var(--color-border-primary)',
              borderRadius: 8, padding: '11px 13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Attachments ({attachments.length})
              </div>
              <button
                onClick={() => setShowAttachForm(v => !v)}
                style={{
                  fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
                  padding: '3px 8px', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
                }}
              >
                + Attach File
              </button>
            </div>

            {showAttachForm && (
              <div
                style={{
                  background: 'var(--color-background-secondary)', borderRadius: 6,
                  padding: '10px 10px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <input
                  type="text"
                  value={attachDescription}
                  onChange={e => setAttachDescription(e.target.value)}
                  placeholder="Description (optional)"
                  style={{
                    fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
                    padding: '5px 8px', outline: 'none', background: 'white',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    style={{
                      fontSize: 11, background: '#0C447C', color: '#fff', border: 'none',
                      borderRadius: 5, padding: '5px 12px', cursor: uploadingFile ? 'default' : 'pointer',
                      opacity: uploadingFile ? 0.7 : 1, fontWeight: 500,
                    }}
                  >
                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                  </button>
                  <button
                    onClick={() => { setShowAttachForm(false); setAttachDescription('') }}
                    style={{
                      fontSize: 11, background: 'none', border: '0.5px solid var(--color-border-primary)',
                      borderRadius: 5, padding: '5px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.mp4"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }}
                />
              </div>
            )}

            {attachments.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No attachments.</div>
            )}

            {attachments.map(att => (
              <div
                key={att.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="2" y="1" width="10" height="12" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1" />
                  <path d="M4 5h6M4 7h6M4 9h4" stroke="var(--color-text-secondary)" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/attachments/${att.id}/url`)
                      if (!res.ok) return
                      const { url } = await res.json()
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    style={{
                      color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0, fontSize: 11, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%',
                    }}
                  >
                    {att.file_name}
                  </button>
                  {att.description && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {att.description}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }}>
                  {formatFileSize(att.file_size)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          style={{
            width: 205, flexShrink: 0, borderLeft: '0.5px solid var(--color-border-tertiary)',
            background: 'white', overflowY: 'auto', padding: 12,
          }}
        >
          <SidebarField label="Facility">
            {ticket.facility_id ? (
              <a
                href={`/facilities/${ticket.facility_id}`}
                style={{ fontSize: 12, color: '#0C447C', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {ticket.facility_name}
              </a>
            ) : (
              <>
                <div style={{ fontSize: 12, marginBottom: 5 }}>{ticket.facility_name}</div>
                <div style={{ position: 'relative' }} ref={facilityDropdownRef}>
                  <button
                    onClick={openFacilitySearch}
                    disabled={linkingFacility}
                    style={{
                      fontSize: 10, border: '0.5px solid var(--color-border-primary)', borderRadius: 4,
                      padding: '3px 7px', background: 'none', cursor: 'pointer',
                      color: '#0C447C', opacity: linkingFacility ? 0.6 : 1,
                    }}
                  >
                    {linkingFacility ? 'Linking...' : '+ Link to facility'}
                  </button>
                  {showFacilityDropdown && (
                    <div
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'white', border: '0.5px solid var(--color-border-primary)',
                        borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 200, marginTop: 2, maxHeight: 200, overflowY: 'auto',
                      }}
                    >
                      <input
                        autoFocus
                        value={facilitySearch}
                        onChange={e => setFacilitySearch(e.target.value)}
                        placeholder="Search facilities..."
                        style={{
                          width: '100%', fontSize: 11, border: 'none', borderBottom: '0.5px solid var(--color-border-tertiary)',
                          padding: '6px 8px', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      {allFacilities
                        .filter(f => f.name.toLowerCase().includes(facilitySearch.toLowerCase()))
                        .map(f => (
                          <div
                            key={f.id}
                            onMouseDown={() => linkFacility(f)}
                            style={{ padding: '7px 8px', fontSize: 11, cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ fontWeight: 500 }}>{f.name}</div>
                            {f.address && <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{f.address}</div>}
                          </div>
                        ))}
                      {allFacilities.filter(f => f.name.toLowerCase().includes(facilitySearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '10px 8px', fontSize: 11, color: 'var(--color-text-muted)' }}>No matches</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {ticket.facility_location && (
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 3 }}>{ticket.facility_location}</div>
            )}
          </SidebarField>

          <SidebarDivider />

          <SidebarField label="Contact">
            {ticket.contact_name && <div style={{ fontSize: 12, marginBottom: 2 }}>{ticket.contact_name}</div>}
            {ticket.contact_email && (
              <a href={`mailto:${ticket.contact_email}`} style={{ fontSize: 11, color: '#0C447C', display: 'block', marginBottom: 2 }}>{ticket.contact_email}</a>
            )}
            {ticket.contact_phone && (
              <a href={`tel:${ticket.contact_phone}`} style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>{ticket.contact_phone}</a>
            )}
            {ticket.facility_id && (ticket.contact_name || ticket.contact_email) && (
              <button
                onClick={saveContactToFacility}
                disabled={savingContact}
                style={{
                  marginTop: 5, fontSize: 10, border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 4, padding: '3px 7px', background: 'none',
                  cursor: savingContact ? 'default' : 'pointer',
                  color: '#1D9E75', opacity: savingContact ? 0.6 : 1,
                }}
              >
                {savingContact ? 'Saving...' : '↑ Save contact to facility'}
              </button>
            )}
          </SidebarField>

          <SidebarDivider />

          <SidebarField label="Assigned To">
            <select
              value={ticket.assigned_to ?? ''}
              onChange={e => updateField('assigned_to', e.target.value)}
              style={{ width: '100%', fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '4px 6px' }}
            >
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </SidebarField>

          <SidebarDivider />

          <SidebarField label="Priority">
            <select
              value={ticket.priority}
              onChange={e => updateField('priority', e.target.value)}
              style={{ width: '100%', fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '4px 6px' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </SidebarField>

          <SidebarDivider />

          <SidebarField label="Issue Type">
            <select
              value={ticket.type}
              onChange={e => updateField('type', e.target.value)}
              style={{ width: '100%', fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '4px 6px' }}
            >
              <option value="channel">Channel</option>
              <option value="remote">Remote</option>
              <option value="billing">Billing</option>
              <option value="tech">Tech</option>
              <option value="programming">Programming</option>
              <option value="other">Other</option>
            </select>
          </SidebarField>

          <SidebarDivider />

          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            Time Tracking
          </div>
          {[
            { label: 'Days Open', value: `${days}d` },
            { label: 'Opened', value: formatDate(ticket.created_at) },
            { label: 'Last Updated', value: formatDate(ticket.updated_at) },
            { label: 'Source', value: ticket.source.replace('_', ' ') },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
              <span style={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{row.value}</span>
            </div>
          ))}

          {activity.length > 0 && (
            <>
              <SidebarDivider />
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                Activity
              </div>
              {activity.map(entry => (
                <div key={entry.id} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-border-secondary)', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{entry.user_name}</strong>{' '}
                      {entry.action}
                      {entry.old_value && entry.new_value && (
                        <span> from <em>{entry.old_value}</em> to <em>{entry.new_value}</em></span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7, color: 'var(--color-text-secondary)' }}>
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function NoteItem({
  note,
  userMap,
  onReply,
  isReplying = false,
  isReply = false,
}: {
  note: Note
  userMap: Map<string, User>
  onReply?: () => void
  isReplying?: boolean
  isReply?: boolean
}) {
  const author = userMap.get(note.user_id)
  const initials = note.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div
        style={{
          width: isReply ? 20 : 24, height: isReply ? 20 : 24, borderRadius: '50%', flexShrink: 0,
          background: author?.avatar_color ?? '#E85D26',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isReply ? 8 : 9, color: '#fff', fontWeight: 600,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            background: isReplying ? '#EBF3FC' : 'var(--color-background-secondary)',
            borderRadius: '0 7px 7px 7px', padding: '7px 9px',
            border: isReplying ? '0.5px solid #B5D4F4' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: isReply ? 10 : 11, fontWeight: 500 }}>{note.user_name}</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{formatDate(note.created_at)}</span>
            {onReply && (
              <button
                onClick={onReply}
                style={{
                  marginLeft: 'auto', fontSize: 10, background: 'none', border: 'none',
                  cursor: 'pointer', color: isReplying ? '#0C447C' : 'var(--color-text-secondary)',
                  fontWeight: isReplying ? 500 : 400, padding: 0,
                }}
              >
                {isReplying ? '↩ Replying' : 'Reply'}
              </button>
            )}
          </div>
          <p style={{ fontSize: isReply ? 10 : 11, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
        </div>
      </div>
    </div>
  )
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function SidebarDivider() {
  return <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '11px 0' }} />
}

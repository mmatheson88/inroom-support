'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/badge'
import { useToast } from '@/components/toast'

interface Facility {
  id: string
  name: string
  address: string | null
  room_count: number | null
  deal_type: string | null
  deal_open_date: string | null
  deal_won_date: string | null
  product: string | null
  location: string | null
  contact_name: string | null
  contact_email: string | null
  created_at: string
}

interface Ticket {
  id: string
  title: string
  type: string
  priority: string
  status: string
  created_at: string
  assigned_to: string | null
}

interface Contact {
  id: string
  facility_id: string
  name: string
  email: string | null
  role: string | null
  is_primary: boolean
  created_at: string
}

const emptyContactForm = { name: '', email: '', role: '', is_primary: false }

export default function FacilityDetail({
  facility: initialFacility,
  tickets,
  contacts: initialContacts,
}: {
  facility: Facility
  tickets: Ticket[]
  contacts: Contact[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [facility, setFacility] = useState(initialFacility)
  const [contacts, setContacts] = useState(initialContacts)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Facility>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState(emptyContactForm)
  const [savingContact, setSavingContact] = useState(false)

  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length

  function startEdit() {
    setEditForm({
      name: facility.name,
      address: facility.address ?? '',
      room_count: facility.room_count,
      deal_type: facility.deal_type ?? '',
      product: facility.product ?? '',
      deal_open_date: facility.deal_open_date ?? '',
      deal_won_date: facility.deal_won_date ?? '',
      contact_name: facility.contact_name ?? '',
      contact_email: facility.contact_email ?? '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    setSavingEdit(true)
    const res = await fetch(`/api/facilities/${facility.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        address: editForm.address || null,
        room_count: editForm.room_count || null,
        deal_type: editForm.deal_type || null,
        product: editForm.product || null,
        deal_open_date: editForm.deal_open_date || null,
        deal_won_date: editForm.deal_won_date || null,
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      const { facility: updated } = await res.json()
      setFacility(updated)
      setEditing(false)
      toast('Facility updated')
    } else {
      toast('Failed to save', 'error')
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.name.trim()) return
    setSavingContact(true)
    const res = await fetch(`/api/facilities/${facility.id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    })
    setSavingContact(false)
    if (res.ok) {
      const { contact } = await res.json()
      setContacts(prev => [...prev, contact])
      setContactForm(emptyContactForm)
      setShowContactForm(false)
      toast('Contact added')
    } else {
      toast('Failed to add contact', 'error')
    }
  }

  async function removeContact(contactId: string) {
    if (!confirm('Remove this contact?')) return
    const res = await fetch(`/api/facilities/${facility.id}/contacts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    })
    if (res.ok) {
      setContacts(prev => prev.filter(c => c.id !== contactId))
      toast('Contact removed')
    } else {
      toast('Failed to remove contact', 'error')
    }
  }

  const fieldStyle: React.CSSProperties = {
    fontSize: 12,
    border: '0.5px solid var(--color-border-primary)',
    borderRadius: 5,
    padding: '5px 8px',
    width: '100%',
    outline: 'none',
    background: 'white',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div
        style={{
          background: 'white', height: 48, padding: '0 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push('/facilities')}
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
          Facilities
        </button>
        <h1 style={{ fontSize: 13, fontWeight: 500, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {facility.name}
        </h1>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Total Tickets', value: totalTickets, color: '#0C447C' },
              { label: 'Open', value: openTickets, color: '#E85D26' },
              { label: 'In Progress', value: inProgressTickets, color: '#BA7517' },
              { label: 'Resolved', value: resolvedTickets, color: '#1D9E75' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: 'white', border: '0.5px solid var(--color-border-primary)',
                  borderRadius: 8, padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Tickets */}
          <div
            style={{
              background: 'white', border: '0.5px solid var(--color-border-primary)',
              borderRadius: 8, overflow: 'hidden', marginBottom: 14,
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-primary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Tickets ({tickets.length})
            </div>
            {tickets.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                No tickets linked to this facility.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-primary)' }}>
                    {['Title', 'Type', 'Priority', 'Status', 'Created'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '7px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, i) => (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/tickets/${t.id}`)}
                      style={{
                        borderBottom: i < tickets.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                      <td style={{ padding: '8px 12px' }}><TypeBadge value={t.type} /></td>
                      <td style={{ padding: '8px 12px' }}><PriorityBadge value={t.priority} /></td>
                      <td style={{ padding: '8px 12px' }}><StatusBadge value={t.status} /></td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Contacts */}
          <div
            style={{
              background: 'white', border: '0.5px solid var(--color-border-primary)',
              borderRadius: 8, overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-primary)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                Contacts ({contacts.length})
              </div>
              <button
                onClick={() => setShowContactForm(v => !v)}
                style={{
                  fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5,
                  padding: '3px 8px', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
                }}
              >
                + Add Contact
              </button>
            </div>

            {showContactForm && (
              <form
                onSubmit={addContact}
                style={{
                  padding: '12px', borderBottom: '0.5px solid var(--color-border-primary)',
                  background: 'var(--color-background-secondary)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8, alignItems: 'end',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Name *</div>
                  <input required value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" style={fieldStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Email</div>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" style={fieldStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Role</div>
                  <input value={contactForm.role} onChange={e => setContactForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Director" style={fieldStyle} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={contactForm.is_primary}
                    onChange={e => setContactForm(p => ({ ...p, is_primary: e.target.checked }))}
                  />
                  Primary
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="submit"
                    disabled={savingContact}
                    style={{ fontSize: 11, border: 'none', borderRadius: 5, padding: '5px 10px', background: '#0C447C', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: savingContact ? 0.7 : 1 }}
                  >
                    {savingContact ? '...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowContactForm(false); setContactForm(emptyContactForm) }}
                    style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '5px 8px', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                  >
                    ×
                  </button>
                </div>
              </form>
            )}

            {contacts.length === 0 && !showContactForm && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                No contacts yet.
              </div>
            )}

            {contacts.map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: '10px 12px',
                  borderBottom: i < contacts.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</span>
                    {c.is_primary && (
                      <span style={{ fontSize: 9, background: '#E6F1FB', color: '#0C447C', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>
                        Primary
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {c.role && <span style={{ marginRight: 8 }}>{c.role}</span>}
                    {c.email && <a href={`mailto:${c.email}`} style={{ color: '#0C447C' }}>{c.email}</a>}
                  </div>
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, padding: '2px 4px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          style={{
            width: 220, flexShrink: 0, borderLeft: '0.5px solid var(--color-border-tertiary)',
            background: 'white', overflowY: 'auto', padding: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Facility Info
            </div>
            {!editing ? (
              <button
                onClick={startEdit}
                style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '3px 8px', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  style={{ fontSize: 11, border: 'none', borderRadius: 5, padding: '3px 8px', background: '#0C447C', color: '#fff', cursor: 'pointer', opacity: savingEdit ? 0.7 : 1 }}
                >
                  {savingEdit ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 5, padding: '3px 6px', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {[
            { label: 'Name', field: 'name' as const, value: facility.name },
            { label: 'Address', field: 'address' as const, value: facility.address },
            { label: 'Room Count', field: 'room_count' as const, value: facility.room_count?.toString() },
            { label: 'Deal Type', field: 'deal_type' as const, value: facility.deal_type },
            { label: 'Product', field: 'product' as const, value: facility.product },
            { label: 'Deal Open Date', field: 'deal_open_date' as const, value: facility.deal_open_date },
            { label: 'Deal Won Date', field: 'deal_won_date' as const, value: facility.deal_won_date },
          ].map(({ label, field, value }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 3 }}>
                {label}
              </div>
              {editing ? (
                <input
                  value={(editForm[field] as string | null | undefined) ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                  style={fieldStyle}
                />
              ) : (
                <div style={{ fontSize: 12 }}>{value ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</div>
              )}
            </div>
          ))}

          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 4, paddingTop: 12 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Primary Contact
            </div>
            {editing ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Name</div>
                  <input value={(editForm.contact_name as string) ?? ''} onChange={e => setEditForm(p => ({ ...p, contact_name: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Email</div>
                  <input type="email" value={(editForm.contact_email as string) ?? ''} onChange={e => setEditForm(p => ({ ...p, contact_email: e.target.value }))} style={fieldStyle} />
                </div>
              </>
            ) : (
              <>
                {facility.contact_name && <div style={{ fontSize: 12, marginBottom: 2 }}>{facility.contact_name}</div>}
                {facility.contact_email && (
                  <a href={`mailto:${facility.contact_email}`} style={{ fontSize: 11, color: '#0C447C', display: 'block' }}>
                    {facility.contact_email}
                  </a>
                )}
                {!facility.contact_name && !facility.contact_email && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  fontSize: 11,
  border: '0.5px solid var(--color-border-primary)',
  borderRadius: 5,
  padding: '4px 7px',
  width: '100%',
  outline: 'none',
  background: 'white',
  boxSizing: 'border-box',
}

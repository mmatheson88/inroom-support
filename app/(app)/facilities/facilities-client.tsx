'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  contact_name: string | null
  contact_email: string | null
  location: string | null
  created_at: string
}

const emptyForm = {
  name: '',
  address: '',
  room_count: '',
  deal_type: '',
  product: '',
  deal_open_date: '',
  deal_won_date: '',
  contact_name: '',
  contact_email: '',
}

export default function FacilitiesClient({ facilities: initial }: { facilities: Facility[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [facilities, setFacilities] = useState(initial)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = facilities.filter(f => {
    const q = search.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      (f.address ?? '').toLowerCase().includes(q)
    )
  })

  async function handleSync() {
    setSyncing(true)
    const res = await fetch('/api/sync/facilities', { method: 'POST' })
    setSyncing(false)
    if (res.ok) {
      const { upserted, skipped } = await res.json()
      toast(`Sync complete: ${upserted} updated, ${skipped} skipped`)
      router.refresh()
    } else {
      const err = await res.json()
      toast(err.error ?? 'Sync failed', 'error')
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/facilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        address: form.address || null,
        room_count: form.room_count ? parseInt(form.room_count, 10) : null,
        deal_type: form.deal_type || null,
        product: form.product || null,
        deal_open_date: form.deal_open_date || null,
        deal_won_date: form.deal_won_date || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const { facility } = await res.json()
      setFacilities(prev => [...prev, facility].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
      setForm(emptyForm)
      toast('Facility added')
    } else {
      const err = await res.json()
      toast(err.error ?? 'Failed to add facility', 'error')
    }
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    border: '0.5px solid var(--color-border-primary)',
    borderRadius: 6,
    padding: '7px 10px',
    width: '100%',
    outline: 'none',
    background: 'white',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    display: 'block',
    marginBottom: 4,
  }

  return (
    <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or address..."
          style={{
            flex: 1,
            fontSize: 12,
            border: '0.5px solid var(--color-border-primary)',
            borderRadius: 6,
            padding: '6px 10px',
            outline: 'none',
            background: 'white',
          }}
        />
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            fontSize: 11, border: '0.5px solid var(--color-border-primary)', borderRadius: 6,
            padding: '6px 12px', background: 'white', cursor: syncing ? 'default' : 'pointer',
            color: 'var(--color-text-secondary)', opacity: syncing ? 0.6 : 1, whiteSpace: 'nowrap',
          }}
        >
          {syncing ? 'Syncing...' : '↻ Sync from Google Sheets'}
        </button>
        <button
          onClick={() => setShowModal(true)}
          style={{
            fontSize: 11, border: 'none', borderRadius: 6, padding: '6px 14px',
            background: '#E85D26', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          + Add Facility
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'white', border: '0.5px solid var(--color-border-primary)',
          borderRadius: 8, overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-primary)', background: 'var(--color-background-secondary)' }}>
              {['Name', 'Address', 'Rooms', 'Deal Type', 'Open Date', 'Product', 'Won Date'].map(col => (
                <th
                  key={col}
                  style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'var(--color-text-secondary)', fontWeight: 500,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {search ? 'No facilities match your search.' : 'No facilities yet. Sync from Google Sheets or add one manually.'}
                </td>
              </tr>
            )}
            {filtered.map((f, i) => (
              <tr
                key={f.id}
                onClick={() => router.push(`/facilities/${f.id}`)}
                style={{
                  borderBottom: i < filtered.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{f.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.address ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.room_count ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.deal_type ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.deal_open_date ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.product ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{f.deal_won_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-text-muted)' }}>
        {filtered.length} of {facilities.length} facilities
      </div>

      {/* Add Facility Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            style={{
              background: 'white', borderRadius: 10, padding: 24,
              width: 520, maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Add Facility</div>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Name <span style={{ color: '#E85D26' }}>*</span></label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Facility name" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Room Count</label>
                  <input type="number" value={form.room_count} onChange={e => setForm(p => ({ ...p, room_count: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Deal Type</label>
                  <input value={form.deal_type} onChange={e => setForm(p => ({ ...p, deal_type: e.target.value }))} placeholder="e.g. MDU, SMATV" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Product</label>
                  <input value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} placeholder="e.g. DIRECTV" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Deal Open Date</label>
                  <input value={form.deal_open_date} onChange={e => setForm(p => ({ ...p, deal_open_date: e.target.value }))} placeholder="MM/DD/YYYY" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Deal Won Date</label>
                  <input value={form.deal_won_date} onChange={e => setForm(p => ({ ...p, deal_won_date: e.target.value }))} placeholder="MM/DD/YYYY" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Primary contact" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="contact@facility.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm) }}
                  style={{ fontSize: 12, border: '0.5px solid var(--color-border-primary)', borderRadius: 6, padding: '7px 16px', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ fontSize: 12, border: 'none', borderRadius: 6, padding: '7px 20px', background: '#E85D26', color: '#fff', fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Adding...' : 'Add Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

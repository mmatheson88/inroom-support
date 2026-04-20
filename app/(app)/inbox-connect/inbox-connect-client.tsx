'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/tokens'
import { useToast } from '@/components/toast'

interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  avatar_color: string
  gmail_connected: boolean
  last_scan_at: string | null
}

interface ScanSettings {
  id: string
  frequency_minutes: number
  auto_create: boolean
  keywords: string[]
}

export default function InboxConnectClient({
  users,
  scanSettings: initialSettings,
  currentUserId,
  scansTotal,
  ticketsCreated,
}: {
  users: TeamUser[]
  scanSettings: ScanSettings | null
  currentUserId: string
  scansTotal: number
  ticketsCreated: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [settings, setSettings] = useState(initialSettings ?? {
    frequency_minutes: 15,
    auto_create: false,
    keywords: ['issue', 'problem', 'broken', 'not working', 'outage', 'channel'],
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [scanning, setScanning] = useState(false)

  async function saveSettings(updated: typeof settings) {
    setSavingSettings(true)
    const res = await fetch('/api/scan-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updated, updated_by: currentUserId }),
    })
    setSavingSettings(false)
    if (res.ok) toast('Settings saved')
    else toast('Failed to save settings', 'error')
  }

  async function triggerScan() {
    setScanning(true)
    const res = await fetch('/api/scan/trigger', { method: 'POST' })
    setScanning(false)
    if (res.ok) {
      toast('Scan started')
      router.refresh()
    } else {
      toast('Scan failed', 'error')
    }
  }

  async function connectGmail(userId: string) {
    const res = await fetch(`/api/gmail/connect?userId=${userId}`)
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  async function disconnectGmail(userId: string) {
    const res = await fetch(`/api/gmail/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      toast('Gmail disconnected')
      router.refresh()
    }
  }

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || settings.keywords.includes(kw)) return
    const updated = { ...settings, keywords: [...settings.keywords, kw] }
    setSettings(updated)
    setNewKeyword('')
    saveSettings(updated)
  }

  function removeKeyword(kw: string) {
    const updated = { ...settings, keywords: settings.keywords.filter(k => k !== kw) }
    setSettings(updated)
    saveSettings(updated)
  }

  return (
    <div>
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
          marginBottom: 18,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="7" stroke="#0C447C" strokeWidth="1" />
          <path d="M8 7v5M8 5v1" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 12, color: '#0C447C', margin: 0, lineHeight: 1.5 }}>
          Connect team inboxes to automatically scan for support issues. Emails are analyzed by AI and can auto-create tickets or be sent to the review queue based on your settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {users.map(u => (
          <InboxCard
            key={u.id}
            user={u}
            onConnect={() => connectGmail(u.id)}
            onDisconnect={() => disconnectGmail(u.id)}
          />
        ))}
      </div>

      {/* Settings */}
      <div
        style={{
          background: 'white',
          border: '0.5px solid var(--color-border-primary)',
          borderRadius: 9,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Scan Settings</div>

        <SettingsRow
          title="Auto-Create Tickets"
          description="Automatically create tickets for high-confidence detections (≥85%)"
        >
          <Toggle
            checked={settings.auto_create}
            onChange={v => {
              const updated = { ...settings, auto_create: v }
              setSettings(updated)
              saveSettings(updated)
            }}
          />
        </SettingsRow>

        <SettingsRow
          title="Scan Frequency"
          description="How often to check connected inboxes for new emails"
          last
        >
          <div style={{ display: 'flex', gap: 4 }}>
            {([{ label: '3x daily', value: 480 }, { label: '2x daily', value: 720 }, { label: '1x daily', value: 1440 }] as const).map(opt => {
              const active = settings.frequency_minutes === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const updated = { ...settings, frequency_minutes: opt.value }
                    setSettings(updated)
                    saveSettings(updated)
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: `0.5px solid ${active ? '#0C447C' : 'var(--color-border-primary)'}`,
                    background: active ? '#0C447C' : 'white',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </SettingsRow>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Keywords</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            Emails containing these keywords are flagged for review
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {settings.keywords.map(kw => (
              <span
                key={kw}
                style={{
                  background: '#E6F1FB',
                  color: '#0C447C',
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 12, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
            <form
              onSubmit={e => { e.preventDefault(); addKeyword() }}
              style={{ display: 'flex', gap: 4 }}
            >
              <input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Add keyword..."
                style={{
                  fontSize: 10,
                  border: '0.5px dashed var(--color-border-primary)',
                  borderRadius: 4,
                  padding: '3px 8px',
                  outline: 'none',
                  background: 'white',
                }}
              />
              <button
                type="submit"
                style={{ fontSize: 10, background: '#0C447C', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
              >
                Add
              </button>
            </form>
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={triggerScan}
            disabled={scanning}
            style={{
              background: '#0C447C',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 500,
              cursor: scanning ? 'default' : 'pointer',
              opacity: scanning ? 0.7 : 1,
            }}
          >
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {scansTotal} total scans · {ticketsCreated} tickets created
          </span>
        </div>
      </div>
    </div>
  )
}

function InboxCard({ user, onConnect, onDisconnect }: { user: TeamUser; onConnect: () => void; onDisconnect: () => void }) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${user.gmail_connected ? '#9FE1CB' : 'var(--color-border-primary)'}`,
        borderRadius: 9,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: user.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 600,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{user.role}</div>
        </div>
        <span
          style={{
            background: user.gmail_connected ? '#E1F5EE' : '#FAEEDA',
            color: user.gmail_connected ? '#0F6E56' : '#633806',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: user.gmail_connected ? '#1D9E75' : '#BA7517',
            }}
          />
          {user.gmail_connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3l5 3.5L11 3" stroke="var(--color-text-secondary)" strokeWidth="1" />
          <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1" />
        </svg>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{user.email}</span>
      </div>

      {user.gmail_connected && user.last_scan_at && (
        <div style={{ fontSize: 10, color: '#1D9E75', marginBottom: 10 }}>
          Last scanned {formatDate(user.last_scan_at)}
        </div>
      )}

      <button
        onClick={user.gmail_connected ? onDisconnect : onConnect}
        style={{
          width: '100%',
          padding: '7px',
          fontSize: 12,
          borderRadius: 6,
          cursor: 'pointer',
          border: user.gmail_connected ? '0.5px solid var(--color-border-primary)' : 'none',
          background: user.gmail_connected ? 'none' : '#E85D26',
          color: user.gmail_connected ? 'var(--color-text-secondary)' : '#fff',
          fontWeight: 500,
        }}
      >
        {user.gmail_connected ? 'Disconnect Gmail' : 'Connect Gmail'}
      </button>
    </div>
  )
}

function SettingsRow({ title, description, children, last }: { title: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: last ? 'none' : '0.5px solid var(--color-border-tertiary)',
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{description}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 34, height: 19, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? '#1D9E75' : 'var(--color-border-secondary)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2, left: checked ? 17 : 2,
          width: 15, height: 15, borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

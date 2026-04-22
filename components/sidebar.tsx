'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface SidebarProps {
  user: { id: string; name: string; email: string; role: string; avatarColor: string }
  counts: { open: number; inProgress: number; pending: number }
}

function NavItem({
  href,
  icon,
  label,
  badge,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 10px',
        margin: '1px 6px',
        borderRadius: 6,
        fontSize: 12,
        color: active ? '#fff' : 'rgba(255,255,255,0.7)',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#fff'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
        }
      }}
    >
      <span style={{ flexShrink: 0, width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            background: '#E85D26',
            color: '#fff',
            fontSize: 9,
            padding: '1px 6px',
            borderRadius: 10,
            marginLeft: 'auto',
            fontWeight: 500,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 9,
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '12px 12px 4px',
      }}
    >
      {label}
    </div>
  )
}

export default function Sidebar({ user, counts }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const status = searchParams.get('status')
  const assigned = searchParams.get('assigned')

  const isAllTickets = pathname === '/tickets' && !status && !assigned
  const isOpen = pathname === '/tickets' && status === 'open'
  const isInProgress = pathname === '/tickets' && status === 'in_progress'
  const isResolved = pathname === '/tickets' && status === 'resolved'
  const isMyTickets = pathname === '/tickets' && assigned === user.id

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      style={{
        width: 168,
        flexShrink: 0,
        background: '#0C447C',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: 14,
          borderBottom: '0.5px solid rgba(255,255,255,0.12)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>InRoom Support</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
          InRoom Media
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        <SectionLabel label="Main" />
        <NavItem
          href="/dashboard"
          active={pathname === '/dashboard'}
          label="Dashboard"
          badge={counts.open}
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="7" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="7" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          }
        />
        <NavItem
          href="/facilities"
          active={pathname === '/facilities' || pathname.startsWith('/facilities/')}
          label="Facilities"
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <rect x="1" y="5" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 12V9h2v3M7 12V9h2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M1 5l5.5-4 5.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <NavItem
          href="/tickets"
          active={isAllTickets}
          label="All Tickets"
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <path d="M2 3.5h9M2 6.5h9M2 9.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
        />
        <NavItem
          href="/tickets?status=open"
          active={isOpen}
          label="Open"
          badge={counts.open}
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
            </svg>
          }
        />
        <NavItem
          href="/tickets?status=in_progress"
          active={isInProgress}
          label="In Progress"
          badge={counts.inProgress}
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
            </svg>
          }
        />
        <NavItem
          href="/tickets?status=resolved"
          active={isResolved}
          label="Resolved"
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />

        <SectionLabel label="Team" />
        <NavItem
          href={`/tickets?assigned=${user.id}`}
          active={isMyTickets}
          label="My Tickets"
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1.5 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
        />
        <NavItem
          href="/reports"
          active={pathname === '/reports'}
          label="Reports"
          icon={
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <rect x="1" y="7" width="2" height="5" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="4" width="2" height="8" rx="0.5" fill="currentColor" />
              <rect x="8" y="1" width="2" height="11" rx="0.5" fill="currentColor" />
            </svg>
          }
        />

        {user.role === 'admin' && (
          <>
            <SectionLabel label="Settings" />
            <NavItem
              href="/inbox-connect"
              active={pathname === '/inbox-connect'}
              label="Inbox Connect"
              icon={
                <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
                  <path d="M1.5 3.5l5 3.5 5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <rect x="1" y="3" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              }
            />
            <NavItem
              href="/review-queue"
              active={pathname === '/review-queue'}
              label="Review Queue"
              badge={counts.pending}
              icon={
                <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 4v3l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
            />
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 8,
              right: 8,
              background: '#fff',
              borderRadius: 7,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              zIndex: 100,
              marginBottom: 4,
            }}
          >
            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: '#1a1a1a',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Profile
            </Link>
            <button
              onClick={signOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: '#c0392b',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign Out
            </button>
          </div>
        )}

        <button
          onClick={() => setDropdownOpen(v => !v)}
          style={{
            width: '100%',
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            borderTop: '0.5px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: user.avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                color: '#fff',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
              {user.role === 'admin' ? 'Admin' : 'Member'}
            </div>
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 4l3-3 3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

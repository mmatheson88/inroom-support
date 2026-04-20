'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginForm() {
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 16px',
        border: '0.5px solid var(--color-border-primary)',
        borderRadius: 6,
        background: 'white',
        cursor: loading ? 'default' : 'pointer',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        opacity: loading ? 0.7 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-background-secondary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
    >
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M15.5 8.16c0-.57-.05-1.12-.14-1.66H8v3.14h4.2a3.6 3.6 0 01-1.56 2.36v1.96h2.52C14.6 12.56 15.5 10.52 15.5 8.16z" fill="#4285F4" />
          <path d="M8 16c2.1 0 3.87-.7 5.16-1.89l-2.52-1.96c-.7.47-1.6.75-2.64.75-2.03 0-3.75-1.37-4.36-3.22H1.04v2.02C2.32 14.15 4.98 16 8 16z" fill="#34A853" />
          <path d="M3.64 9.68A4.8 4.8 0 013.38 8c0-.59.1-1.16.26-1.68V4.3H1.04A8 8 0 000 8c0 1.29.31 2.51.85 3.6l2.79-1.92z" fill="#FBBC05" />
          <path d="M8 3.18c1.14 0 2.17.39 2.97 1.16l2.23-2.23C11.86.79 10.1 0 8 0 4.98 0 2.32 1.85 1.04 4.54l2.6 2.02C4.25 4.55 5.97 3.18 8 3.18z" fill="#EA4335" />
        </svg>
      )}
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  )
}

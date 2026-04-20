import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background-tertiary)',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: '36px 40px',
          width: 360,
          border: '0.5px solid var(--color-border-primary)',
        }}
      >
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#0C447C',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            InRoom Support
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Sign in to manage tickets
          </p>
        </div>

        {error === 'auth_failed' && (
          <div
            style={{
              background: '#FCEBEB',
              border: '0.5px solid #A32D2D',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 16,
              fontSize: 12,
              color: '#791F1F',
            }}
          >
            Authentication failed. Please try again.
          </div>
        )}

        <LoginForm />

        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 20, margin: '20px 0 0' }}>
          Access restricted to InRoom Media team members.
        </p>
      </div>
    </div>
  )
}

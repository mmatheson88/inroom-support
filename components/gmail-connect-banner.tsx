'use client'

import { useState } from 'react'

export default function GmailConnectBanner({ userId }: { userId: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      style={{
        background: '#E6F1FB',
        border: '0.5px solid #B5D4F4',
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3.5l6.5 4.5 6.5-4.5" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="#0C447C" strokeWidth="1.2" />
      </svg>
      <p style={{ fontSize: 12, color: '#0C447C', margin: 0, flex: 1, lineHeight: 1.5 }}>
        <strong>Connect your Gmail inbox</strong> to automatically detect customer support issues from your emails.
      </p>
      <a
        href={`/api/gmail/connect?userId=${userId}`}
        style={{
          background: '#0C447C',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          padding: '5px 12px',
          borderRadius: 6,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        Connect Gmail
      </a>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#0C447C',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 2px',
          flexShrink: 0,
          opacity: 0.6,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

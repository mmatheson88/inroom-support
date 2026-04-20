import React from 'react'

interface TopbarProps {
  title: string
  children?: React.ReactNode
}

export default function Topbar({ title, children }: TopbarProps) {
  return (
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
      <h1
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          flex: 1,
          margin: 0,
        }}
      >
        {title}
      </h1>
      {children}
    </div>
  )
}

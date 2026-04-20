import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InRoom Support',
  description: 'Internal ticket management for InRoom Media',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>{children}</body>
    </html>
  )
}

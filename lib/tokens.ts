export const colors = {
  primary: '#0C447C',
  accent: '#E85D26',
  success: '#1D9E75',
  warning: '#BA7517',
  danger: '#A32D2D',
  purple: '#3C3489',
  sidebar: '#0C447C',
}

export const priority = {
  critical: { bg: '#FCEBEB', text: '#791F1F', border: '#A32D2D' },
  high: { bg: '#FAECE7', text: '#712B13', border: '#993C1D' },
  medium: { bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
  low: { bg: '#EAF3DE', text: '#27500A', border: '#3B6D11' },
}

export const status = {
  open: { bg: '#E6F1FB', text: '#0C447C' },
  in_progress: { bg: '#FAEEDA', text: '#633806' },
  resolved: { bg: '#EAF3DE', text: '#27500A' },
}

export const issueType = {
  channel: { bg: '#E6F1FB', text: '#0C447C' },
  remote: { bg: '#FAECE7', text: '#712B13' },
  billing: { bg: '#EAF3DE', text: '#27500A' },
  tech: { bg: '#EEEDFE', text: '#3C3489' },
  programming: { bg: '#FAEEDA', text: '#633806' },
  other: { bg: '#F1EFE8', text: '#5F5E5A' },
}

export const daysOpen = (days: number) => {
  if (days < 3) return '#3B6D11'
  if (days <= 7) return '#BA7517'
  return '#A32D2D'
}

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

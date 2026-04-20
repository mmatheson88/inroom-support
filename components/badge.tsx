import { priority, status, issueType } from '@/lib/tokens'

type PriorityKey = keyof typeof priority
type StatusKey = keyof typeof status
type TypeKey = keyof typeof issueType

export function PriorityBadge({ value }: { value: string }) {
  const key = value as PriorityKey
  const colors = priority[key] ?? priority.low
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 4,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const key = value as StatusKey
  const colors = status[key] ?? status.open
  const label = value === 'in_progress' ? 'In Progress' : value.charAt(0).toUpperCase() + value.slice(1)
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

export function TypeBadge({ value }: { value: string }) {
  const key = value as TypeKey
  const colors = issueType[key] ?? issueType.other
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 4,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  )
}

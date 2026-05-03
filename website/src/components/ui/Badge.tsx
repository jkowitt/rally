import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  tone?: BadgeTone
  className?: string
  children?: ReactNode
}

// Lifted from the FulfillmentTracker STATUS_STYLES pattern. Pairs
// a translucent background with the matching foreground so the
// badge is legible at a glance — no need to read the text to tell
// success from warning.
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-bg-card text-text-secondary border border-border',
  accent:  'bg-accent/10 text-accent border border-accent/20',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger:  'bg-danger/10 text-danger border border-danger/20',
  info:    'bg-sky-500/10 text-sky-300 border border-sky-500/20',
}

export default function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}

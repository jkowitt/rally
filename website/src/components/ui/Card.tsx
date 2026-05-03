import type { HTMLAttributes, ReactNode } from 'react'

export type CardVariant = 'surface' | 'card' | 'dashed'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children?: ReactNode
}

const VARIANT: Record<CardVariant, string> = {
  surface: 'bg-bg-surface border border-border',
  card:    'bg-bg-card border border-border',
  dashed:  'bg-bg-surface border border-dashed border-border',
}

// Responsive padding scales: tighten on mobile, breathe at sm+.
// Mirrors the existing `p-4 sm:p-5` pattern that's already
// established across most surfaces.
const PADDING: Record<CardPadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-3 sm:p-4',
  lg:   'p-4 sm:p-5',
}

// The 8px-grid card. Replaces 246 ad-hoc
// `bg-bg-surface border border-border rounded-lg` chains.
//
//   <Card>...</Card>                       → surface, p-4
//   <Card variant="card" padding="sm">…</Card>
//   <Card variant="dashed">…</Card>        → empty-state friendly
export default function Card({
  variant = 'surface',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`${VARIANT[variant]} rounded-lg ${PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

// Shared UI primitives. Import from here so consumers get a stable
// surface even if the underlying file structure shifts:
//   import { Card, Button, Badge, EmptyState } from '@/components/ui'

export { default as Card } from './Card'
export type { CardProps, CardVariant, CardPadding } from './Card'

export { default as Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { default as Badge } from './Badge'
export type { BadgeProps, BadgeTone } from './Badge'

export { default as EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

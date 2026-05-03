import type { ReactNode } from 'react'
import Card from './Card'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

// Standardised empty state for "no contracts yet" / "no deals yet"
// pages. Replaces the ~15 weak empty states the audit found.
//
//   <EmptyState
//     icon={<FileText className="w-8 h-8 text-text-muted" />}
//     title="No contracts yet"
//     description="Sign a deal and the contract will land here."
//     primaryAction={<Button>Upload contract</Button>}
//   />
export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <Card variant="dashed" padding="lg" className={`text-center ${className}`}>
      {icon && (
        <div className="flex justify-center mb-3" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-base font-semibold text-text-primary mb-1">{title}</div>
      {description && (
        <div className="text-sm text-text-muted max-w-md mx-auto mb-4">{description}</div>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </Card>
  )
}

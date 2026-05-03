import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children?: ReactNode
  fullWidth?: boolean
}

const BASE = 'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-accent text-bg-primary hover:bg-accent/90',
  secondary: 'bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/40',
  ghost:     'text-text-secondary hover:text-text-primary hover:bg-bg-card',
  danger:    'bg-danger text-white hover:bg-danger/90',
  subtle:    'text-accent hover:underline underline-offset-2',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-sm px-4 py-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const width = fullWidth ? 'w-full' : ''
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${width} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  tone?: 'surface' | 'green-soft'
  padding?: 'md' | 'lg'
}

export function Card({ children, className = '', tone = 'surface', padding = 'lg' }: CardProps) {
  const toneClasses =
    tone === 'green-soft' ? 'bg-green-soft border-green-soft-line' : 'bg-surface border-line shadow-card'
  const paddingClasses = padding === 'lg' ? 'p-7 lg:p-6' : 'p-6 lg:p-5'
  return (
    <div className={`rounded-card border ${toneClasses} ${paddingClasses} ${className}`}>{children}</div>
  )
}

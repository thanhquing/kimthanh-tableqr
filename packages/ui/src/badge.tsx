import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { cx } from './utils.js'

export type BadgeTone = 'neutral' | 'brand' | 'danger' | 'success'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode
  readonly tone?: BadgeTone
}

export function Badge({ children, className, tone = 'neutral', ...props }: BadgeProps): ReactElement {
  return (
    <span {...props} className={cx('kt-badge', `kt-badge-${tone}`, className)}>
      {children}
    </span>
  )
}

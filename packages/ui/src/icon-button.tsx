import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils.js'

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly 'aria-label': string
  readonly icon: ReactNode
  readonly isRound?: boolean
  readonly variant?: IconButtonVariant
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, isRound = false, type = 'button', variant = 'ghost', ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      className={cx('kt-icon-btn', `kt-icon-btn-${variant}`, isRound && 'kt-icon-btn-round', className)}
      type={type}
    >
      {icon}
    </button>
  )
})

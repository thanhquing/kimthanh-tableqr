import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils.js'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly block?: boolean
  readonly iconLeft?: ReactNode
  readonly iconRight?: ReactNode
  readonly isLoading?: boolean
  readonly size?: ButtonSize
  readonly variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    block = false,
    children,
    className,
    disabled,
    iconLeft,
    iconRight,
    isLoading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      className={cx(
        'kt-btn',
        `kt-btn-${variant}`,
        size === 'lg' && 'kt-btn-lg',
        block && 'kt-btn-block',
        isLoading && 'kt-btn-loading',
        className,
      )}
      disabled={disabled ?? isLoading}
      type={type}
    >
      {isLoading ? <span aria-hidden="true" className="kt-spinner" /> : iconLeft}
      <span>{children}</span>
      {!isLoading ? iconRight : null}
    </button>
  )
})

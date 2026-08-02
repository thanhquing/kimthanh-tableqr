import { type ReactElement, type ReactNode } from 'react'
import { cx } from './utils.js'

export interface ToastItem {
  readonly action?: ReactNode
  readonly id: string
  readonly message: ReactNode
}

export interface ToastProps extends ToastItem {
  readonly className?: string
}

export function Toast({ action, className, message }: ToastProps): ReactElement {
  return (
    <div className={cx('kt-toast', className)} role="status">
      <span>{message}</span>
      {action}
    </div>
  )
}

export interface ToastRegionProps {
  readonly className?: string
  readonly toasts: readonly ToastItem[]
}

export function ToastRegion({ className, toasts }: ToastRegionProps): ReactElement | null {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className={cx('kt-toast-region', className)}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}

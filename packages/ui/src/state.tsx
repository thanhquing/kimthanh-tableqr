import { type ReactElement, type ReactNode } from 'react'
import { cx } from './utils.js'

export interface EmptyStateProps {
  readonly action?: ReactNode
  readonly className?: string
  readonly description?: ReactNode
  readonly icon?: ReactNode
  readonly title: ReactNode
}

export function EmptyState({ action, className, description, icon, title }: EmptyStateProps): ReactElement {
  return (
    <section className={cx('kt-state', className)}>
      {icon ? <div className="kt-state-icon">{icon}</div> : null}
      <h2 className="kt-state-title">{title}</h2>
      {description ? <p className="kt-state-description">{description}</p> : null}
      {action}
    </section>
  )
}

export interface ErrorStateProps {
  readonly action?: ReactNode
  readonly className?: string
  readonly description?: ReactNode
  readonly title?: ReactNode
}

export function ErrorState({
  action,
  className,
  description = 'Vui lòng thử lại.',
  title = 'Có lỗi xảy ra',
}: ErrorStateProps): ReactElement {
  return (
    <section className={cx('kt-state', className)}>
      <div className="kt-state-icon" aria-hidden="true">
        !
      </div>
      <h2 className="kt-state-title">{title}</h2>
      <p className="kt-state-description">{description}</p>
      {action}
    </section>
  )
}

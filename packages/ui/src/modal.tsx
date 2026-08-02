import { type ReactElement, type ReactNode, useId } from 'react'
import { useFocusTrap } from './focus-trap.js'
import { cx } from './utils.js'

export interface ModalProps {
  readonly actions?: ReactNode
  readonly children?: ReactNode
  readonly className?: string
  readonly description?: ReactNode
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: ReactNode
}

export function Modal({
  actions,
  children,
  className,
  description,
  isOpen,
  onClose,
  title,
}: ModalProps): ReactElement | null {
  const titleId = useId()
  const descriptionId = useId()
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose)

  if (!isOpen) {
    return null
  }

  return (
    <>
      <button aria-label="Đóng hộp thoại" className="kt-scrim" onClick={onClose} type="button" />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx('kt-modal', className)}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="kt-modal-body">
          <div className="kt-modal-header">
            <h2 className="kt-modal-title" id={titleId}>
              {title}
            </h2>
          </div>
          {description ? (
            <p className="kt-modal-description" id={descriptionId}>
              {description}
            </p>
          ) : null}
          {children}
          {actions ? <div className="kt-modal-actions">{actions}</div> : null}
        </div>
      </div>
    </>
  )
}

import { type PointerEvent, type ReactElement, type ReactNode, useId, useRef } from 'react'
import { useFocusTrap } from './focus-trap.js'
import { cx } from './utils.js'

export interface BottomSheetProps {
  readonly actions?: ReactNode
  readonly children?: ReactNode
  readonly className?: string
  readonly description?: ReactNode
  readonly isOpen: boolean
  readonly media?: ReactNode
  readonly onClose: () => void
  readonly title: ReactNode
}

export function BottomSheet({
  actions,
  children,
  className,
  description,
  isOpen,
  media,
  onClose,
  title,
}: BottomSheetProps): ReactElement | null {
  const titleId = useId()
  const descriptionId = useId()
  const sheetRef = useFocusTrap<HTMLDivElement>(isOpen, onClose)
  const pointerStartY = useRef<number | null>(null)

  if (!isOpen) {
    return null
  }

  return (
    <>
      <button aria-label="Đóng bảng chi tiết" className="kt-scrim" onClick={onClose} type="button" />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx('kt-sheet', className)}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          pointerStartY.current = event.clientY
        }}
        onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
          if (pointerStartY.current !== null && event.clientY - pointerStartY.current > 80) onClose()
          pointerStartY.current = null
        }}
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <div aria-hidden="true" className="kt-sheet-grab" />
        {media}
        <div className="kt-sheet-body">
          <h2 className="kt-sheet-title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="kt-sheet-description" id={descriptionId}>
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

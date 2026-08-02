import { type HTMLAttributes, type ReactElement } from 'react'
import { cx } from './utils.js'

export interface QuantityStepperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  readonly decrementLabel?: string
  readonly incrementLabel?: string
  readonly max?: number
  readonly min?: number
  readonly onChange: (nextValue: number) => void
  readonly value: number
}

export function QuantityStepper({
  className,
  decrementLabel = 'Giảm số lượng',
  incrementLabel = 'Tăng số lượng',
  max,
  min = 1,
  onChange,
  value,
  ...props
}: QuantityStepperProps): ReactElement {
  const canDecrement = value > min
  const canIncrement = max === undefined || value < max

  return (
    <div {...props} className={cx('kt-stepper', className)}>
      <button
        aria-label={decrementLabel}
        className="kt-stepper-btn"
        disabled={!canDecrement}
        onClick={() => onChange(Math.max(min, value - 1))}
        type="button"
      >
        -
      </button>
      <span aria-live="polite" className="kt-stepper-value kt-num">
        {value}
      </span>
      <button
        aria-label={incrementLabel}
        className="kt-stepper-btn"
        disabled={!canIncrement}
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        type="button"
      >
        +
      </button>
    </div>
  )
}

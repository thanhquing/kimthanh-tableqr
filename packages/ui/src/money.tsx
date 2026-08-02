import { formatVnd } from '@kimthanh-tableqr/contracts'
import { type HTMLAttributes, type ReactElement } from 'react'
import { cx } from './utils.js'

export interface MoneyProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly amount: number
}

export function Money({ amount, className, ...props }: MoneyProps): ReactElement {
  return (
    <span {...props} className={cx('kt-money', className)}>
      {formatVnd(amount)}
    </span>
  )
}

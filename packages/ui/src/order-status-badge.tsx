import { ORDER_STATUS_LABEL, type OrderStatus } from '@kimthanh-tableqr/contracts'
import { type HTMLAttributes, type ReactElement } from 'react'
import { cx } from './utils.js'

const orderStatusClass: Record<OrderStatus, string> = {
  NEW: 'kt-order-status-new',
  PREPARING: 'kt-order-status-preparing',
  SERVED: 'kt-order-status-served',
  CANCELLED: 'kt-order-status-cancelled',
}

export interface OrderStatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly status: OrderStatus
}

export function OrderStatusBadge({ className, status, ...props }: OrderStatusBadgeProps): ReactElement {
  return (
    <span {...props} className={cx('kt-badge', orderStatusClass[status], className)}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

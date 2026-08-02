import { type HTMLAttributes, type ReactElement } from 'react'
import { cx } from './utils.js'

export interface LoadingSkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  readonly height?: number | string
  readonly width?: number | string
}

export function LoadingSkeleton({ className, height, style, width, ...props }: LoadingSkeletonProps): ReactElement {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cx('kt-skeleton', className)}
      style={{ height, width, ...style }}
    />
  )
}

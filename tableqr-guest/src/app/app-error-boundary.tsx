import { Component, type ErrorInfo, type ReactNode } from 'react'
import { EmptyState } from '@kimthanh-tableqr/ui'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Error boundary giữ app không rơi vào màn trắng; logging từ xa sẽ được nối sau MVP.
    void error
    void info
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="guest-invalid-page"><EmptyState description="Vui lòng tải lại trang. Nếu vẫn chưa được, hãy gọi nhân viên hỗ trợ." title="Đã có lỗi xảy ra" /></main>
      )
    }

    return this.props.children
  }
}

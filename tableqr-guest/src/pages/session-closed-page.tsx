import { EmptyState } from '@kimthanh-tableqr/ui'

export function SessionClosedPage() {
  return <main className="guest-route-state"><EmptyState description="Phiên gọi món đã kết thúc. Quét lại mã QR trên bàn để gọi món mới." title="Phiên đã kết thúc" /></main>
}

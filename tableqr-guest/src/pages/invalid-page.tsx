import { EmptyState } from '@kimthanh-tableqr/ui'

export function InvalidPage() {
  return (
    <main className="guest-invalid-page">
      <EmptyState
        description="Mã QR không hợp lệ hoặc bàn đã ngừng phục vụ. Vui lòng gọi nhân viên để được hỗ trợ."
        title="Không tìm thấy bàn"
      />
    </main>
  )
}

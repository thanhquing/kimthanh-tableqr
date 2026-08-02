import { EmptyState } from '@kimthanh-tableqr/ui'
import { useTableSessionContext } from '../features/table-session/table-session-context'

export function MenuPage() {
  const { bootstrap } = useTableSessionContext()
  const hasMenu = bootstrap.categories.length > 0 && bootstrap.items.length > 0

  if (!hasMenu) {
    return (
      <main>
        <EmptyState
          description="Vui lòng gọi nhân viên để được hỗ trợ gọi món."
          title="Quán chưa cập nhật thực đơn"
        />
      </main>
    )
  }

  return (
    <main className="guest-route-state">
      <EmptyState
        description={`${bootstrap.categories.length} danh mục · ${bootstrap.items.length} món`}
        title="Thực đơn"
      />
    </main>
  )
}

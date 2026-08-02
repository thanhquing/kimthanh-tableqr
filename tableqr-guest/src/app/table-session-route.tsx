import { Button, ErrorState, LoadingSkeleton } from '@kimthanh-tableqr/ui'
import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { TableSessionProvider } from '../features/table-session/table-session-context'
import { useTableSession } from '../features/table-session/use-table-session'
import { getApiClientErrorMessage, isApiClientError } from '../lib/api/client'
import { GuestShell } from './guest-shell'

export function TableSessionRoute() {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const query = useTableSession(qrToken)

  useEffect(() => {
    if (
      isApiClientError(query.error) &&
      query.error.body?.error.code === 'TABLE_NOT_FOUND'
    ) {
      navigate('/t/invalid', { replace: true })
    }
  }, [navigate, query.error])

  if (!qrToken) return <Navigate replace to="/t/invalid" />

  if (query.isPending) return <TableSessionLoading />

  if (query.isError) {
    if (
      isApiClientError(query.error) &&
      query.error.body?.error.code === 'TABLE_NOT_FOUND'
    ) {
      return null
    }

    return (
      <div className="guest-app">
        <main>
          <ErrorState
            action={<Button onClick={() => void query.refetch()} variant="secondary">Thử lại</Button>}
            description={getApiClientErrorMessage(query.error)}
            title="Không tải được thực đơn"
          />
        </main>
      </div>
    )
  }

  return (
    <TableSessionProvider bootstrap={query.data} qrToken={qrToken}>
      <GuestShell>
        <Outlet />
      </GuestShell>
    </TableSessionProvider>
  )
}

function TableSessionLoading() {
  return (
    <div className="guest-app">
      <header className="guest-header" aria-label="Đang tải thông tin bàn">
        <span className="guest-header__orders guest-header__orders--placeholder" />
        <LoadingSkeleton className="guest-header__name-skeleton" height={20} width="58%" />
        <LoadingSkeleton className="guest-header__table-skeleton" height={28} width={74} />
      </header>
      <main className="guest-loading-list">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="guest-loading-item" key={index}>
            <LoadingSkeleton className="guest-loading-thumb" height={88} width={88} />
            <div className="guest-loading-copy">
              <LoadingSkeleton height={18} width="68%" />
              <LoadingSkeleton height={14} width="92%" />
              <LoadingSkeleton height={18} width="36%" />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

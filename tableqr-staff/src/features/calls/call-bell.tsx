import { STAFF_CALL_TYPE_LABEL, type StaffCallsResponse } from '@kimthanh-tableqr/contracts'
import { Button, Modal, ToastRegion } from '@kimthanh-tableqr/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useStaffAuth } from '../auth/auth-context'
import { completeStaffCall, getStaffCalls } from '../../lib/api/staff'

function relativeTime(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 60_000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  return `${Math.floor(minutes / 60)} giờ trước`
}

export function CallBell() {
  const { auth } = useStaffAuth()
  const client = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const calls = useQuery({
    enabled: Boolean(auth),
    queryKey: ['staff-calls'],
    queryFn: () => getStaffCalls(auth!.token),
    refetchInterval: 3_000,
  })

  async function complete(id: string) {
    const previous = calls.data
    setProcessingId(id)
    client.setQueryData<StaffCallsResponse>(['staff-calls'], (current) => current ? { calls: current.calls.filter((call) => call.id !== id) } : current)
    try {
      await completeStaffCall(auth!.token, id)
    } catch (caught) {
      client.setQueryData(['staff-calls'], previous)
      setMessage(caught instanceof Error ? caught.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.')
    } finally {
      setProcessingId(null)
    }
  }

  const pending = calls.data?.calls ?? []
  return <>
    <button aria-label="Khách gọi nhân viên" className="staff-call-bell" onClick={() => setIsOpen(true)} type="button">
      <Bell size={21} />
      {pending.length ? <span>{pending.length}</span> : null}
    </button>
    <Modal
      actions={<Button onClick={() => setIsOpen(false)} variant="secondary">Đóng</Button>}
      description={pending.length ? undefined : 'Hiện không có yêu cầu nào đang chờ.'}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Khách gọi nhân viên"
    >
      {pending.length ? <div className="staff-call-list">
        {pending.map((call) => <div className={call.type === 'REQUEST_BILL' ? 'staff-call staff-call--bill' : 'staff-call'} key={call.id}>
          <strong>{call.table.displayName}</strong>
          <span><b>{STAFF_CALL_TYPE_LABEL[call.type]}</b><small>{relativeTime(call.createdAt)}</small></span>
          <Button disabled={processingId === call.id} onClick={() => void complete(call.id)} variant="secondary">{processingId === call.id ? 'Đang xử lý...' : 'Đã xử lý'}</Button>
        </div>)}
      </div> : null}
    </Modal>
    <ToastRegion toasts={message ? [{ id: 'staff-call-error', message }] : []} />
  </>
}

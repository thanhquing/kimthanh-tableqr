import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { claimStaffDevicePairing } from '../lib/api/staff'

export const STAFF_PAIRING_KEY = 'tableqr.staffPairing.v1'

/** QR nhân viên chỉ ghép tablet với quán; PIN vẫn là bước xác thực bắt buộc. */
export function PairDevicePage() {
  const { pairingToken } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pairingToken) return
    let cancelled = false
    void claimStaffDevicePairing(pairingToken)
      .then(({ staffLoginCode }) => {
        if (cancelled) return
        localStorage.setItem(STAFF_PAIRING_KEY, staffLoginCode.trim().toUpperCase())
        navigate('/login', { replace: true })
      })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Không thể ghép thiết bị.') })
    return () => { cancelled = true }
  }, [navigate, pairingToken])

  return <main className="staff-login"><section><h1>Đang ghép thiết bị bếp</h1><p>{error || (pairingToken ? 'Đang mở màn hình nhập PIN…' : 'Mã ghép thiết bị không hợp lệ.')}</p></section></main>
}

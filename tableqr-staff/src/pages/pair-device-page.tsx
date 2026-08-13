import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export const STAFF_PAIRING_KEY = 'tableqr.staffPairing.v1'

/** QR nhân viên chỉ ghép tablet với quán; PIN vẫn là bước xác thực bắt buộc. */
export function PairDevicePage() {
  const { restaurantCode } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (!restaurantCode) return
    localStorage.setItem(STAFF_PAIRING_KEY, restaurantCode.trim().toUpperCase())
    navigate('/login', { replace: true })
  }, [navigate, restaurantCode])

  return <main className="staff-login"><section><h1>Đang ghép thiết bị bếp</h1><p>{restaurantCode ? 'Đang mở màn hình nhập PIN…' : 'Mã ghép thiết bị không hợp lệ.'}</p></section></main>
}

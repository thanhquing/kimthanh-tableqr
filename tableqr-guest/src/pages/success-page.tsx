import { Button } from '@kimthanh-tableqr/ui'
import { calcCartItemCount, calcCartTotal, calcLineTotal, formatVnd, type CartLine } from '@kimthanh-tableqr/contracts'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

function readLastOrder(sessionId: string): CartLine[] {
  try { const value = sessionStorage.getItem(`tableqr.lastOrder.${sessionId}`); return value ? JSON.parse(value) as CartLine[] : [] } catch { return [] }
}

export function SuccessPage() {
  const { bootstrap, qrToken } = useTableSessionContext()
  const navigate = useNavigate()
  const [seconds, setSeconds] = useState(3)
  const lines = readLastOrder(bootstrap.session.id)

  useEffect(() => {
    if (seconds === 0) { navigate(`/t/${qrToken}/orders`, { replace: true }); return undefined }
    const timeout = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [navigate, qrToken, seconds])

  return <main className="guest-success-page">
    <div className="guest-success-page__tick"><Check size={40} strokeWidth={2.6} /></div>
    <h1>Đã gửi đơn tới bếp</h1>
    <p>Bếp đã nhận đơn của {bootstrap.table.displayName}. Món sẽ được mang ra bàn, bạn không cần làm gì thêm.</p>
    {lines.length ? <section className="guest-success-recap"><h2>Lần gọi này · {calcCartItemCount(lines)} món</h2>{lines.map((line) => <div key={`${line.menuItemId}-${line.note ?? ''}`}><span>{line.quantity}×</span><span><strong>{line.name}</strong>{line.note ? <small>↳ {line.note}</small> : null}</span><strong>{formatVnd(calcLineTotal(line.unitPriceVnd, line.quantity))}</strong></div>)}<footer><strong>Tiền lần này</strong><strong>{formatVnd(calcCartTotal(lines))}</strong></footer></section> : null}
    <Button block onClick={() => navigate(`/t/${qrToken}/orders`, { replace: true })} size="lg">Xem đơn của bàn</Button>
    <p className="guest-success-page__countdown">Tự chuyển sau {seconds} giây</p>
  </main>
}

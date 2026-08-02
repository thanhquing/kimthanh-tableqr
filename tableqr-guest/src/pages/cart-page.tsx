import { Button, EmptyState, QuantityStepper, ToastRegion } from '@kimthanh-tableqr/ui'
import { calcLineTotal, formatVnd, type ItemsUnavailableDetails } from '@kimthanh-tableqr/contracts'
import { AlertCircle, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../features/cart/cart-context'
import { useTableSessionContext } from '../features/table-session/table-session-context'
import { createGuestOrder } from '../lib/api/guest'
import { getApiClientErrorMessage, isApiClientError } from '../lib/api/client'
import { SessionClosedPage } from './session-closed-page'

function newRequestId(): string { return crypto.randomUUID() }
const NOTE_SUGGESTIONS = ['ít đá', 'không rau', 'thêm ớt', 'ít cay', 'không hành']

export function CartPage() {
  const { bootstrap, qrToken } = useTableSessionContext()
  const { clear, itemCount, lines, removeLine, restoreLine, totalVnd, updateNote, updateQuantity } = useCart()
  const navigate = useNavigate()
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [unavailableIds, setUnavailableIds] = useState<readonly string[]>([])
  const [isSessionClosed, setIsSessionClosed] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [removed, setRemoved] = useState<{ readonly index: number; readonly name: string; readonly line: typeof lines[number] } | null>(null)

  useEffect(() => {
    if (!removed) return undefined
    const timeout = window.setTimeout(() => setRemoved(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [removed])

  if (!lines.length) return <main className="guest-route-state"><EmptyState action={<Link className="kt-btn kt-btn-primary" to={`/t/${qrToken}`}>Xem thực đơn</Link>} description="Xem thực đơn và chọn món bạn muốn gọi." title="Chưa chọn món nào" /></main>

  async function submitOrder() {
    if (isSending) return
    setErrorMessage(null); setUnavailableIds([]); setIsSending(true)
    try {
      await createGuestOrder(bootstrap.session.id, { note: null, items: lines.map(({ menuItemId, note, quantity }) => ({ menuItemId, note, quantity })) }, newRequestId())
      sessionStorage.setItem(`tableqr.lastOrder.${bootstrap.session.id}`, JSON.stringify(lines))
      clear()
      navigate(`/t/${qrToken}/success`)
    } catch (error) {
      setErrorMessage(getApiClientErrorMessage(error))
      if (isApiClientError(error) && error.body?.error.code === 'ITEMS_UNAVAILABLE') {
        const details = error.body.error.details as ItemsUnavailableDetails | null
        setUnavailableIds(details?.unavailableItemIds ?? [])
      }
      if (isApiClientError(error) && error.body?.error.code === 'SESSION_CLOSED') setIsSessionClosed(true)
    } finally { setIsSending(false) }
  }

  if (isSessionClosed) return <SessionClosedPage />

  function startEditing(index: number) { setEditingIndex(index); setNoteDraft(lines[index]?.note ?? '') }
  function toggleSuggestion(suggestion: string) {
    const parts = noteDraft.split(',').map((part) => part.trim()).filter(Boolean)
    setNoteDraft((parts.includes(suggestion) ? parts.filter((part) => part !== suggestion) : [...parts, suggestion]).join(', '))
  }
  function remove(index: number) {
    const line = lines[index]
    if (!line) return
    setRemoved({ index, line, name: line.name }); removeLine(index)
  }

  return <main className="guest-cart-page">
    <div className="guest-cart-page__title"><Link aria-label="Quay lại thực đơn" className="guest-cart-page__back" to={`/t/${qrToken}`}><ArrowLeft size={22} /></Link><h1>Giỏ hàng</h1></div>
    {errorMessage ? <div className="guest-cart-page__warning" role="alert"><AlertCircle size={18} />{errorMessage}</div> : null}
    {lines.map((line, index) => <article className={`guest-cart-line ${unavailableIds.includes(line.menuItemId) ? 'guest-cart-line--unavailable' : ''}`} key={`${line.menuItemId}-${line.note ?? ''}`}>
      <div className="guest-cart-line__content"><h2>{line.name}</h2><p>{formatVnd(line.unitPriceVnd)}</p>{editingIndex === index ? <div className="guest-cart-line__note-editor"><textarea aria-label={`Ghi chú cho ${line.name}`} onChange={(event) => setNoteDraft(event.target.value)} rows={2} value={noteDraft} /><div>{NOTE_SUGGESTIONS.map((suggestion) => <button aria-pressed={noteDraft.split(',').map((part) => part.trim()).includes(suggestion)} key={suggestion} onClick={() => toggleSuggestion(suggestion)} type="button">{suggestion}</button>)}</div><Button onClick={() => { updateNote(index, noteDraft); setEditingIndex(null) }} variant="secondary">Xong</Button></div> : <button className="guest-cart-line__note-button" onClick={() => startEditing(index)} type="button"><Pencil size={14} />{line.note ?? 'Thêm ghi chú'}</button>}</div>
      <div className="guest-cart-line__actions"><strong>{formatVnd(calcLineTotal(line.unitPriceVnd, line.quantity))}</strong><QuantityStepper decrementLabel={`Bớt ${line.name}`} incrementLabel={`Thêm ${line.name}`} min={0} onChange={(quantity) => quantity === 0 ? remove(index) : updateQuantity(index, quantity)} value={line.quantity} /><button aria-label={`Xóa ${line.name}`} className="guest-cart-line__remove" onClick={() => remove(index)} type="button"><Trash2 size={18} /></button></div>
    </article>)}
    <dl className="guest-cart-summary"><div><dt>Tạm tính ({itemCount} món)</dt><dd>{formatVnd(totalVnd)}</dd></div><div><dt>Phí phục vụ</dt><dd>Không</dd></div><div className="guest-cart-summary__total"><dt>Tổng cộng</dt><dd>{formatVnd(totalVnd)}</dd></div></dl>
    <footer className="guest-cart-page__footer"><Button block isLoading={isSending} onClick={() => void submitOrder()} size="lg">{isSending ? 'Đang gửi...' : 'Gửi đơn'}</Button></footer>
    <ToastRegion toasts={removed ? [{ id: 'cart-line-removed', message: `Đã xoá ${removed.name}`, action: <Button onClick={() => { restoreLine(removed.line); setRemoved(null) }} variant="ghost">Hoàn tác</Button> }] : []} />
  </main>
}

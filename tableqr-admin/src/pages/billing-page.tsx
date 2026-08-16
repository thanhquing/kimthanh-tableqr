import { formatVnd } from '@kimthanh-tableqr/contracts'
import { Button, ErrorState, LoadingSkeleton } from '@kimthanh-tableqr/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Copy, CreditCard, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { useAdminAuth } from '../features/auth/auth-context'
import { createPaymentIntent, getBillingSummary } from '../lib/api/admin'

const date = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const statusCopy = { TRIAL: 'Đang dùng thử', ACTIVE: 'Đang hoạt động', GRACE: 'Cần gia hạn', PAST_DUE: 'Cần thanh toán', SUSPENDED: 'Tạm ngưng' } as const
const cycleCopy = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', VOID: 'Đã hủy' } as const

export function BillingPage() {
  const { auth } = useAdminAuth()
  const client = useQueryClient()
  const summary = useQuery({ queryKey: ['admin-billing'], queryFn: () => getBillingSummary(auth!.token) })
  const [instruction, setInstruction] = useState<Awaited<ReturnType<typeof createPaymentIntent>> | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  if (summary.isPending) return <div className="admin-billing"><LoadingSkeleton height={500} width="100%" /></div>
  if (summary.error) return <ErrorState title="Không tải được thông tin thanh toán" action={<Button onClick={() => void summary.refetch()} variant="secondary">Thử lại</Button>} />
  const data = summary.data
  const endAt = data.subscription.status === 'TRIAL' ? data.subscription.trialEndsAt : data.subscription.currentPeriodEndsAt
  const daysLeft = Math.max(0, Math.ceil((new Date(endAt ?? data.subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
  async function makeIntent() { setCreating(true); setError(''); setCopied(false); try { const next = await createPaymentIntent(auth!.token); setInstruction(next); await client.invalidateQueries({ queryKey: ['admin-billing'] }) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể tạo hướng dẫn thanh toán.') } finally { setCreating(false) } }
  async function copyCode() { if (!instruction) return; try { await navigator.clipboard.writeText(instruction.instruction.transferContent); setCopied(true) } catch { setError('Không thể sao chép mã. Bạn có thể chọn và sao chép thủ công.') } }
  return <div className="admin-billing"><header className="admin-billing__heading"><div><p>Gói dịch vụ</p><h1>Thanh toán & gói cước</h1><span>Quản lý gói hiện tại và gia hạn cho quán của bạn.</span></div><div className={`admin-billing__status admin-billing__status--${data.subscription.status.toLowerCase()}`}><CheckCircle2 size={18} />{statusCopy[data.subscription.status]}</div></header><section className="admin-billing__plan"><div className="admin-billing__plan-icon"><CreditCard size={24} /></div><div><p>Gói hiện tại</p><h2>{data.plan.name}</h2><strong>{formatVnd(data.plan.priceVnd)} <small>/ tháng</small></strong><span>Không giới hạn đơn hàng</span></div><div className="admin-billing__period"><Clock3 size={19} /><div><b>{data.subscription.status === 'TRIAL' ? `Còn ${daysLeft} ngày dùng thử` : `Còn ${daysLeft} ngày trong kỳ`}</b><span>{data.subscription.status === 'TRIAL' ? `Dùng thử đến ${date(data.subscription.trialEndsAt)}` : `Kỳ hiện tại đến ${date(data.subscription.currentPeriodEndsAt)}`}</span></div></div></section><div className="admin-billing__grid"><section className="admin-billing__card"><header><div><h2>Gia hạn thanh toán</h2><p>Chuyển khoản đúng số tiền và nội dung để hệ thống tự xác nhận.</p></div><Button disabled={creating} onClick={() => void makeIntent()}>{creating ? 'Đang tạo...' : 'Tạo hướng dẫn thanh toán'}</Button></header>{error ? <p className="admin-menu__error" role="alert">{error}</p> : null}{instruction ? <div className="admin-billing__instruction" role="status"><b>Chuyển khoản {formatVnd(instruction.instruction.amountVnd)}</b><span>{instruction.instruction.bankName && instruction.instruction.bankAccount ? `${instruction.instruction.bankName} · ${instruction.instruction.bankAccount}` : 'Dùng tài khoản ngân hàng đã được cấu hình với SePay.'}</span><div><code>{instruction.instruction.transferContent}</code><Button aria-label="Sao chép nội dung chuyển khoản" onClick={() => void copyCode()} type="button" variant="secondary"><Copy size={16} />{copied ? 'Đã sao chép' : 'Sao chép'}</Button></div><small>Chỉ xác nhận khi tiền vào đúng số tiền và đúng nội dung. Thường mất chưa đến một phút.</small></div> : <div className="admin-billing__empty"><ReceiptText size={28} /><p>Chưa có hướng dẫn thanh toán đang mở.</p></div>}</section><section className="admin-billing__card admin-billing__cycles"><header><div><h2>Lịch sử kỳ thanh toán</h2><p>Tối đa 12 kỳ gần nhất.</p></div></header>{data.cycles.length ? <ol>{data.cycles.map((cycle) => <li key={cycle.id}><div><b>{cycleCopy[cycle.status]}</b><span>{date(cycle.periodStartsAt)} — {date(cycle.periodEndsAt)}</span></div><div><strong>{formatVnd(cycle.amountVnd)}</strong><span>{cycle.paidAt ? `Thanh toán ${date(cycle.paidAt)}` : `Đến hạn ${date(cycle.dueAt)}`}</span></div></li>)}</ol> : <div className="admin-billing__empty"><ReceiptText size={28} /><p>Chưa có kỳ thanh toán nào.</p></div>}</section></div></div>
}

import { Button, ErrorState, LoadingSkeleton } from '@kimthanh-tableqr/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAdminAuth } from '../features/auth/auth-context'
import { getAccount, getRestaurant, getStaffPairing, updateRestaurant, updateStaffPin } from '../lib/api/admin'

type RestaurantForm = { name: string; logoUrl: string; address: string }
type PinForm = { pin: string; confirmation: string }

const billingStatus = { TRIAL: 'Đang dùng thử', ACTIVE: 'Đang hoạt động', PAST_DUE: 'Cần thanh toán', SUSPENDED: 'Tạm ngưng' } as const
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value))

export function SettingsPage() {
  const { auth } = useAdminAuth()
  const client = useQueryClient()
  const restaurant = useQuery({ queryKey: ['admin-restaurant'], queryFn: () => getRestaurant(auth!.token) })
  const account = useQuery({ queryKey: ['admin-account'], queryFn: () => getAccount(auth!.token) })
  const pairing = useQuery({ queryKey: ['admin-staff-pairing'], queryFn: () => getStaffPairing(auth!.token) })
  const [form, setForm] = useState<RestaurantForm>({ name: '', logoUrl: '', address: '' })
  const [saved, setSaved] = useState<RestaurantForm | null>(null)
  const [restaurantError, setRestaurantError] = useState('')
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [pinForm, setPinForm] = useState<PinForm>({ pin: '', confirmation: '' })
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => {
    if (!restaurant.data) return
    const next = { name: restaurant.data.name, logoUrl: restaurant.data.logoUrl ?? '', address: restaurant.data.address ?? '' }
    setForm(next)
    setSaved(next)
  }, [restaurant.data])

  if (restaurant.isPending || account.isPending) return <div className="admin-settings"><LoadingSkeleton height={560} width="100%" /></div>
  if (restaurant.error || account.error) return <ErrorState action={<Button onClick={() => void Promise.all([restaurant.refetch(), account.refetch()])} variant="secondary">Thử lại</Button>} title="Không tải được cài đặt" />

  const changeRestaurant = (key: keyof RestaurantForm, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const changePin = (key: keyof PinForm, value: string) => setPinForm((current) => ({ ...current, [key]: value.replace(/\D/g, '') }))

  async function saveRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) { setRestaurantError('Tên quán là bắt buộc.'); return }
    setSavingRestaurant(true)
    setRestaurantError('')
    try {
      const result = await updateRestaurant(auth!.token, { name: form.name.trim(), logoUrl: form.logoUrl.trim() || null, address: form.address.trim() || null })
      const next = { name: result.name, logoUrl: result.logoUrl ?? '', address: result.address ?? '' }
      setForm(next)
      setSaved(next)
      client.setQueryData(['admin-restaurant'], result)
      client.setQueryData(['admin-account'], (current: typeof account.data) => current ? { ...current, restaurant: { ...current.restaurant, name: result.name } } : current)
    } catch (caught) {
      setRestaurantError(caught instanceof Error ? caught.message : 'Không thể lưu cài đặt.')
    } finally { setSavingRestaurant(false) }
  }

  async function saveStaffPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPinError('')
    setPinSuccess('')
    if (!/^\d{6}$/.test(pinForm.pin)) { setPinError('PIN phải gồm đúng 6 chữ số.'); return }
    if (pinForm.pin !== pinForm.confirmation) { setPinError('Xác nhận PIN chưa khớp.'); return }
    setSavingPin(true)
    try {
      await updateStaffPin(auth!.token, { pin: pinForm.pin })
      setPinForm({ pin: '', confirmation: '' })
      setPinSuccess('Đã đổi PIN cho thiết bị nhân viên của quán này.')
    } catch (caught) {
      setPinError(caught instanceof Error ? caught.message : 'Không thể đổi PIN nhân viên.')
    } finally { setSavingPin(false) }
  }

  return <div className="admin-settings">
    <h1>Cài đặt quán</h1>
    <div className="admin-settings__layout">
      <div className="admin-settings__primary">
        <form className="admin-settings__form" onSubmit={(event) => void saveRestaurant(event)}>
          <header><h2>Thông tin quán</h2></header>
          <div className="admin-settings__body">
            <div className="admin-settings__logo">{form.logoUrl ? <img alt="Logo quán" src={form.logoUrl} /> : <b>{form.name.trim().charAt(0).toUpperCase() || 'K'}</b>}</div>
            <label>Tên quán *<input onChange={(event) => changeRestaurant('name', event.target.value)} value={form.name} /><small>Hiện trên menu khách và bản in mã QR.</small></label>
            <label>URL logo<input onChange={(event) => changeRestaurant('logoUrl', event.target.value)} placeholder="https://..." value={form.logoUrl} /><small>Giai đoạn này dùng URL ảnh; upload thật là BE-09.</small></label>
            <label>Địa chỉ<input onChange={(event) => changeRestaurant('address', event.target.value)} value={form.address} /></label>
            {restaurantError ? <p className="admin-menu__error" role="alert">{restaurantError}</p> : null}
          </div>
          <footer><Button onClick={() => saved && setForm(saved)} type="button" variant="secondary">Hủy</Button><Button disabled={savingRestaurant} type="submit">{savingRestaurant ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></footer>
        </form>

        <section aria-labelledby="account-heading" className="admin-settings__account">
          <header><h2 id="account-heading">Tài khoản & vận hành</h2></header>
          <div className="admin-settings__body">
            <dl className="admin-settings__details">
              <div><dt>Chủ quán</dt><dd>{account.data.displayName}</dd></div>
              <div><dt>Email đăng nhập</dt><dd>{account.data.email}</dd></div>
              <div><dt>Mã đăng nhập nhân viên</dt><dd><code>{account.data.restaurant.staffLoginCode}</code></dd></div>
              <div><dt>Gói dịch vụ</dt><dd>{billingStatus[account.data.billingStatus]} · đến {formatDate(account.data.trialEndsAt)}</dd></div>
            </dl>
            <form className="admin-settings__pin" onSubmit={(event) => void saveStaffPin(event)}>
              <div><h3>PIN thiết bị nhân viên</h3><p>PIN này áp dụng cho nhân viên thuộc {account.data.restaurant.name}; không ảnh hưởng đến quán khác.</p></div>
              <label>PIN mới<input aria-describedby="staff-pin-hint" autoComplete="new-password" inputMode="numeric" maxLength={6} onChange={(event) => changePin('pin', event.target.value)} pattern="[0-9]{6}" type="password" value={pinForm.pin} /></label>
              <label>Xác nhận PIN<input autoComplete="new-password" inputMode="numeric" maxLength={6} onChange={(event) => changePin('confirmation', event.target.value)} pattern="[0-9]{6}" type="password" value={pinForm.confirmation} /></label>
              <small id="staff-pin-hint">Dùng 6 chữ số. Sau khi đổi, tablet nhân viên cần nhập PIN mới khi đăng nhập lại.</small>
              {pinError ? <p className="admin-menu__error" role="alert">{pinError}</p> : null}
              {pinSuccess ? <p className="admin-settings__success" role="status">{pinSuccess}</p> : null}
              <Button disabled={savingPin} type="submit">{savingPin ? 'Đang đổi PIN...' : 'Đổi PIN'}</Button>
            </form>
          </div>
        </section>
      </div>
      <aside className="admin-settings__preview"><header>Ghép thiết bị bếp</header>{pairing.data ? <div><QRCodeCanvas includeMargin size={180} value={pairing.data.staffPairingUrl} /><p>Tablet quét mã này một lần, sau đó chỉ cần nhập PIN.</p></div> : pairing.error ? <p role="alert">Không thể tạo mã ghép thiết bị.</p> : <LoadingSkeleton height={180} width={180} />}</aside>
    </div>
  </div>
}

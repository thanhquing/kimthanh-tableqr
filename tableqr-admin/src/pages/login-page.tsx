import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../features/auth/auth-context'
import { loginAdmin } from '../lib/api/admin'

export function LoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try { login(await loginAdmin(email, password)); navigate('/menu', { replace: true }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập.') }
    finally { setSubmitting(false) }
  }
  return <main className="admin-login"><form onSubmit={(event) => void submit(event)}><h1>Kim Thành</h1><p>Đăng nhập quản trị quán</p><label><span>Email</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label><span>Mật khẩu</span><input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label><p className="admin-login__error" role="alert">{error}</p><button disabled={submitting} type="submit">{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button><small>Email demo: chuquan@kimthanh.vn · Mật khẩu: kimthanh2026</small></form></main>
}

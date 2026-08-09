import { formatVnd, type CreateMenuItemRequest } from '@kimthanh-tableqr/contracts'
import { Button, ErrorState, LoadingSkeleton } from '@kimthanh-tableqr/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from '../features/auth/auth-context'
import { createItem, getCategories, getItems, updateItem, uploadMenuImage } from '../lib/api/admin'

type Form = { categoryId: string; name: string; description: string; price: string; imageUrl: string; available: boolean; sortOrder: string }
const empty: Form = { categoryId: '', name: '', description: '', price: '', imageUrl: '', available: true, sortOrder: '0' }

export function ItemFormPage() {
  const { auth } = useAdminAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [lastFile, setLastFile] = useState<File | null>(null)
  const [dirty, setDirty] = useState(false)
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => getCategories(auth!.token) })
  const items = useQuery({ queryKey: ['admin-items'], queryFn: () => getItems(auth!.token) })
  const item = useMemo(() => items.data?.items.find((candidate) => candidate.id === id), [id, items.data])

  useEffect(() => {
    if (!id || !item) return
    setForm({ categoryId: item.categoryId, name: item.name, description: item.description ?? '', price: String(item.priceVnd), imageUrl: item.imageUrl ?? '', available: item.isAvailable, sortOrder: String(item.sortOrder) })
  }, [id, item])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  if (categories.isPending || items.isPending) return <div className="admin-form"><LoadingSkeleton height={440} width="100%" /></div>
  if (categories.error || items.error) return <ErrorState action={<Button onClick={() => window.location.reload()} variant="secondary">Thử lại</Button>} title="Không tải được món" />
  if (id && !item) return <ErrorState action={<Button onClick={() => navigate('/menu')} variant="secondary">Về thực đơn</Button>} title="Không tìm thấy món" />

  const change = (key: keyof Form, value: string | boolean) => {
    setDirty(true)
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const upload = async (file: File) => {
    setLastFile(file)
    setUploading(true)
    setUploadError('')
    try {
      const result = await uploadMenuImage(auth!.token, file)
      setDirty(true)
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }))
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : 'Không thể tải ảnh lên.')
    } finally {
      setUploading(false)
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!form.categoryId) next.categoryId = 'Chọn danh mục.'
    if (!form.name.trim()) next.name = 'Nhập tên món.'
    const price = Number(form.price)
    if (!Number.isInteger(price) || price < 0) next.price = 'Giá phải là số nguyên không âm.'
    if (Object.keys(next).length) { setErrors(next); return }
    const body: CreateMenuItemRequest = { categoryId: form.categoryId, name: form.name.trim(), description: form.description.trim() || null, priceVnd: price, imageUrl: form.imageUrl || null, sortOrder: Number(form.sortOrder) || 0 }
    setSaving(true)
    try {
      if (item) await updateItem(auth!.token, item.id, { ...body, isAvailable: form.available })
      else await createItem(auth!.token, body)
      setDirty(false)
      navigate('/menu')
    } catch (caught) {
      setErrors({ form: caught instanceof Error ? caught.message : 'Không thể lưu món.' })
    } finally {
      setSaving(false)
    }
  }

  return <form className="admin-form" onSubmit={(event) => void save(event)}>
    <header><div><h1>{item ? 'Sửa món' : 'Thêm món mới'}</h1><p>Thông tin này hiển thị cho khách khi quét mã QR.</p></div></header>
    {errors.form ? <p className="admin-menu__error">{errors.form}</p> : null}
    <label>Danh mục<select onChange={(event) => change('categoryId', event.target.value)} value={form.categoryId}><option value="">Chọn danh mục</option>{categories.data!.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.categoryId ? <small>{errors.categoryId}</small> : null}</label>
    <label>Tên món<input onChange={(event) => change('name', event.target.value)} value={form.name} />{errors.name ? <small>{errors.name}</small> : null}</label>
    <label>Mô tả<textarea onChange={(event) => change('description', event.target.value)} value={form.description} /></label>
    <label>Giá (VNĐ)<input inputMode="numeric" onChange={(event) => change('price', event.target.value)} value={form.price} /><em>Hiển thị cho khách: {form.price && Number.isFinite(Number(form.price)) ? formatVnd(Number(form.price)) : '-'}</em>{errors.price ? <small>{errors.price}</small> : null}</label>
    <label>Ảnh món<input accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} type="file" /><em>JPG, PNG hoặc WebP, tối đa 5 MB. Hệ thống tự đổi thành WebP 480 × 270 để menu tải nhẹ.</em></label>
    {uploading ? <p className="admin-upload__status">Đang tối ưu ảnh…</p> : null}
    {uploadError ? <p className="admin-menu__error">{uploadError}{lastFile ? <Button onClick={() => void upload(lastFile)} size="sm" type="button" variant="secondary">Thử lại</Button> : null}</p> : null}
    {form.imageUrl ? <div className="admin-upload__preview"><img alt="Xem trước ảnh món" src={form.imageUrl} /><Button onClick={() => { change('imageUrl', ''); setLastFile(null); setUploadError('') }} size="sm" type="button" variant="secondary">Bỏ ảnh</Button></div> : null}
    <label>Thứ tự<input inputMode="numeric" onChange={(event) => change('sortOrder', event.target.value)} value={form.sortOrder} /></label>
    <label className="admin-form__check"><input checked={form.available} onChange={(event) => change('available', event.target.checked)} type="checkbox" />Còn hàng</label>
    <footer><Button onClick={() => navigate('/menu')} type="button" variant="secondary">Hủy</Button><Button disabled={saving || uploading} type="submit">{saving ? 'Đang lưu...' : 'Lưu món'}</Button></footer>
  </form>
}

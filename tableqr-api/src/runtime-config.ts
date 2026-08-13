const developmentSecrets = new Set([
  '',
  'dev-only-secret',
  'thay-chuoi-bi-mat-nay-truoc-khi-deploy',
  'replace-with-a-unique-secret-of-at-least-32-characters',
])

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Thiếu biến môi trường bắt buộc: ${name}.`)
  return value
}

function requireHttpsUrl(name: string) {
  const value = required(name)
  try {
    if (new URL(value).protocol !== 'https:') throw new Error()
  } catch {
    throw new Error(`${name} phải là URL HTTPS hợp lệ khi chạy production.`)
  }
}

/** Không cho API production khởi động với cấu hình bảo mật local/demo. */
export function validateRuntimeConfig() {
  if (process.env.NODE_ENV !== 'production') return

  required('DATABASE_URL')
  required('UPLOAD_DIR')
  const jwtSecret = required('JWT_SECRET')
  if (jwtSecret.length < 32 || developmentSecrets.has(jwtSecret)) {
    throw new Error('JWT_SECRET production phải riêng biệt và dài ít nhất 32 ký tự.')
  }
  requireHttpsUrl('GUEST_BASE_URL')
  requireHttpsUrl('STAFF_BASE_URL')
}

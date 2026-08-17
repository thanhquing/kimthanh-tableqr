import { createHash } from 'node:crypto'

/** Capability của khách chỉ lưu dạng hash; token thô không bao giờ vào DB hay log. */
export function hashGuestAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Dinh dang hien thi. Nguon: ai-docs/05-ui-ux-spec.md §Dinh dang */

/**
 * Dinh dang tien VND: 45000 -> "45.000 đ".
 *
 * Day la CACH DUY NHAT duoc phep hien so tien. Thay `toLocaleString` trong
 * component la sai (quy tac vang #4, CLAUDE.md).
 *
 * Khong dung Intl.NumberFormat vi ket qua khac nhau giua cac may/trinh duyet
 * (co may ra "45.000 ₫", co may ra "45.000 VND"), va vi ky hieu ₫ dat sau kem
 * mot khoang trang la quy uoc da chot.
 */
export function formatVnd(amountVnd: number): string {
  if (!Number.isFinite(amountVnd)) return '0 ₫'
  const rounded = Math.round(amountVnd)
  const sign = rounded < 0 ? '-' : ''
  const digits = Math.abs(rounded).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${grouped} ₫`
}

/** Gio 24h: "10:18". Nhan chuoi ISO. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Thoi gian tuong doi tieng Viet: "vua xong", "3 phut truoc", "1 gio truoc".
 * `now` truyen vao duoc de test khong phu thuoc dong ho that.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSec < 0) return 'vừa xong'
  if (diffSec < 60) return 'vừa xong'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} phút trước`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} giờ trước`
  return `${Math.floor(hour / 24)} ngày trước`
}

/** So phut da troi qua — man hinh bep dung de to do don `NEW` qua 10 phut. */
export function minutesSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 0
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60000))
}

/**
 * Bo dau tieng Viet de tim kiem: "Cà phê sữa đá" -> "ca phe sua da".
 * Nho vay khach go "ca phe" van ra "Cà phê sữa đá".
 *
 * NFD tach dau thanh ky tu to hop roi xoa; rieng đ/Đ khong co dang to hop
 * nen phai thay tay.
 */
export function removeVietnameseTones(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** So khop tim kiem khong phan biet dau va hoa thuong. */
export function matchesSearch(haystack: string, needle: string): boolean {
  const q = removeVietnameseTones(needle)
  if (!q) return true
  return removeVietnameseTones(haystack).includes(q)
}

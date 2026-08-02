/** Enum va bang chuyen trang thai. Nguon: ai-docs/03-domain-model.md */

export const TABLE_STATUS = ['EMPTY', 'OCCUPIED'] as const
export type TableStatus = (typeof TABLE_STATUS)[number]

export const SESSION_STATUS = ['OPEN', 'CLOSED'] as const
export type SessionStatus = (typeof SESSION_STATUS)[number]

export const ORDER_STATUS = ['NEW', 'PREPARING', 'SERVED', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]

export const STAFF_CALL_TYPE = ['CALL_STAFF', 'REQUEST_BILL'] as const
export type StaffCallType = (typeof STAFF_CALL_TYPE)[number]

export const STAFF_CALL_STATUS = ['PENDING', 'DONE'] as const
export type StaffCallStatus = (typeof STAFF_CALL_STATUS)[number]

export type StaffRole = 'staff' | 'owner'

/** Nhan tieng Viet hien cho nguoi dung. Khach va nhan vien doc cung mot bo chu. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Đã gửi bếp',
  PREPARING: 'Đang làm',
  SERVED: 'Đã phục vụ',
  CANCELLED: 'Đã huỷ',
}

export const STAFF_CALL_TYPE_LABEL: Record<StaffCallType, string> = {
  CALL_STAFF: 'Gọi nhân viên',
  REQUEST_BILL: 'Xin tính tiền',
}

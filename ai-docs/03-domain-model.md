# 03 — Mô hình dữ liệu

Định danh code: **tiếng Anh**. TypeScript `camelCase`, cột DB `snake_case`. Tiền lưu **số nguyên VND**, không bao giờ dùng float.

## Sơ đồ quan hệ

```
Restaurant 1──n MenuCategory 1──n MenuItem
     │
     └────n DiningTable 1──n TableSession 1──n Order 1──n OrderItem
                                    │
                                    └──n StaffCall
```

---

## Entity

### `Restaurant`

Thông tin quán. MVP một bản ghi duy nhất.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `name` | string | "Quán Cơm Kim Thành" |
| `logoUrl` | string \| null | |
| `address` | string \| null | |

### `DiningTable`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `code` | string | Mã ngắn duy nhất: `"B01"`. Dùng để nhân viên nói chuyện với nhau. |
| `displayName` | string | Hiển thị cho người: `"Bàn 1"` |
| `qrToken` | string | **Token ngẫu nhiên ≥ 16 ký tự**, là thứ nằm trong URL của mã QR. |
| `status` | `TableStatus` | `EMPTY` \| `OCCUPIED` — dẫn xuất từ việc có `TableSession` OPEN hay không |
| `isActive` | boolean | Tắt bàn mà không phải in lại QR |
| `sortOrder` | int | Thứ tự hiển thị trên sơ đồ bàn |

> **Tại sao URL dùng `qrToken` chứ không dùng `code`?** Nếu URL là `/t/B01` thì ai cũng đoán được `/t/B02`, `/t/B03` và gọi món cho bàn người khác từ ngoài đường. `qrToken` ngẫu nhiên chặn việc đó mà không cần khách đăng nhập.

### `MenuCategory`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `name` | string | "Đồ uống", "Món chính", "Khai vị", "Tráng miệng" |
| `sortOrder` | int | |
| `isActive` | boolean | Ẩn cả danh mục khỏi menu khách |

### `MenuItem`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `categoryId` | string | |
| `name` | string | |
| `description` | string \| null | |
| `priceVnd` | int | **Số nguyên đồng.** 45000 nghĩa là 45.000 ₫ |
| `imageUrl` | string \| null | |
| `isAvailable` | boolean | `false` = "Hết món" |
| `sortOrder` | int | |

### `TableSession`

Một lượt khách ngồi bàn, từ lúc quét QR đến lúc nhân viên Reset bàn.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `tableId` | string | |
| `openedAt` | ISO datetime | |
| `closedAt` | ISO datetime \| null | |
| `status` | `SessionStatus` | `OPEN` \| `CLOSED` |
| `paidAt` | ISO datetime \| null | Nhân viên bấm "Đã thanh toán" |

**Bất biến:** mỗi `tableId` chỉ có tối đa **một** session `OPEN`. Ràng buộc bằng partial unique index ở DB (M6), và bằng kiểm tra trong store ở giai đoạn mock.

### `Order`

Một lần bấm "Gửi đơn".

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `sessionId` | string | |
| `tableId` | string | Lặp lại từ session, để màn hình bếp không phải join |
| `sequenceNo` | int | Lần gọi thứ mấy **trong phiên này**, bắt đầu từ 1 |
| `status` | `OrderStatus` | `NEW` \| `PREPARING` \| `SERVED` \| `CANCELLED` |
| `note` | string \| null | Ghi chú cho cả đơn |
| `createdAt` | ISO datetime | Bếp sắp xếp theo trường này |

### `OrderItem`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `orderId` | string | |
| `menuItemId` | string | Tham chiếu, có thể trỏ tới món sau này bị xoá |
| `nameSnapshot` | string | **Tên món tại thời điểm gửi đơn** |
| `unitPriceVndSnapshot` | int | **Giá tại thời điểm gửi đơn** |
| `quantity` | int | ≥ 1 |
| `note` | string \| null | "ít đá", "không rau", "thêm ớt" |

> **Tại sao snapshot?** Chủ quán đổi giá lúc 7h tối, bàn 3 gọi món lúc 6h30. Nếu bill đọc giá hiện tại thì khách trả tiền khác với giá lúc gọi — sai và dễ cãi nhau. Snapshot làm bill bất biến ngay khi gửi đơn.

### `StaffCall`

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `sessionId` | string | |
| `tableId` | string | |
| `type` | `StaffCallType` | `CALL_STAFF` \| `REQUEST_BILL` |
| `status` | `StaffCallStatus` | `PENDING` \| `DONE` |
| `createdAt` | ISO datetime | |

---

## Enum

```ts
type TableStatus     = 'EMPTY' | 'OCCUPIED'
type SessionStatus   = 'OPEN' | 'CLOSED'
type OrderStatus     = 'NEW' | 'PREPARING' | 'SERVED' | 'CANCELLED'
type StaffCallType   = 'CALL_STAFF' | 'REQUEST_BILL'
type StaffCallStatus = 'PENDING' | 'DONE'
```

Chuyển trạng thái đơn hợp lệ:

```
NEW ──▶ PREPARING ──▶ SERVED
 │           │
 └───────────┴──▶ CANCELLED
```

`SERVED` là trạng thái cuối, không quay lui. Bấm nhầm thì huỷ đơn rồi để khách gọi lại — đơn giản hơn là làm undo.

---

## Giá trị dẫn xuất (tính, không lưu)

| Giá trị | Công thức |
| --- | --- |
| `OrderItem.lineTotalVnd` | `unitPriceVndSnapshot * quantity` |
| `Order.totalVnd` | tổng `lineTotalVnd` các item |
| `TableSession.totalVnd` | tổng `Order.totalVnd` các đơn **không** ở trạng thái `CANCELLED` |
| `DiningTable.status` | `OCCUPIED` nếu có session `OPEN`, ngược lại `EMPTY` |

Hàm tính nằm ở `packages/contracts/src/totals.ts`, dùng chung cho cả 3 app và (sau này) cho API — để FE và BE không bao giờ cộng ra hai số khác nhau.

---

## Quy tắc bất biến (kiểm tra ở cả mock store và API)

1. Mỗi bàn tối đa một `TableSession` `OPEN`.
2. `Order` chỉ tạo được khi session đang `OPEN`.
3. `sequenceNo` liên tục từ 1 trong phạm vi một session.
4. `quantity` ≥ 1; đơn phải có ≥ 1 item.
5. Không tạo `OrderItem` từ `MenuItem` có `isAvailable = false`.
6. Reset bàn = đặt `status=CLOSED` + `closedAt`; **không** xoá `Order` / `OrderItem`.
7. Không sửa `OrderItem` sau khi đơn đã gửi. Sai thì huỷ đơn, gọi lại.

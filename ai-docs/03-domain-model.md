# 03 — Mô hình dữ liệu

Định danh code: **tiếng Anh**. TypeScript `camelCase`, cột DB `snake_case`. Tiền lưu **số nguyên VND**, không bao giờ dùng float.

## Sơ đồ quan hệ

```
Restaurant 1──n MenuCategory 1──n MenuItem
     │
     └────n DiningTable 1──n TableSession 1──n Order 1──n OrderItem
                                    │
                                    └──n StaffCall

AuthUser độc lập với các entity nghiệp vụ; chỉ dùng cho nhân viên/chủ quán đăng nhập.
```

> **Phạm vi hiện tại:** đây là ERD single-restaurant đúng với schema PostgreSQL đang chạy; `Restaurant` và `AuthUser` chưa có FK vào dữ liệu nghiệp vụ. Thiết kế đích multi-tenant/billing (không phải schema đã áp dụng) xem [10-saas-evolution.md](10-saas-evolution.md).

## Thiết kế target — multi-tenant lite (`SA-03`…`SA-07`)

Mục tiêu là một deployment phục vụ nhiều quán **độc lập**. Một tài khoản owner chỉ thuộc một quán; một chi nhánh là một quán/tài khoản khác. Không có `Organization`, `Membership` hay chọn chi nhánh.

```
Restaurant 1──n AuthUser (OWNER / STAFF)
Restaurant 1──n MenuCategory 1──n MenuItem
Restaurant 1──n DiningTable 1──n TableSession 1──n Order 1──n OrderItem
                                            └──n StaffCall
```

### Cột target và ràng buộc

| Bảng | Thay đổi target |
| --- | --- |
| `restaurant` | Có `public_slug` unique, `staff_login_code` unique (mã tenant cho đăng nhập staff), `trial_ends_at`, `billing_status`. |
| `auth_user` | Thêm `restaurant_id` FK bắt buộc sau backfill. `email` tiếp tục unique toàn hệ thống, nên một email chỉ sở hữu một quán. `role` giữ `OWNER` / `STAFF`; staff dùng PIN chung theo quán ở phiên bản đầu. |
| `dining_table`, `menu_category`, `menu_item`, `table_session`, `order`, `staff_call`, `guest_order_request` | Thêm `restaurant_id` FK bắt buộc. API tự điền từ tenant context, không nhận cột này từ client. |

Giữ `dining_table.qr_token` unique toàn hệ thống; đổi `dining_table.code` thành unique `(restaurant_id, code)`. Giữ các unique hiện hữu của session/order/idempotency vì mỗi ID cha đã thuộc một quán. Index query nóng bắt đầu bằng `restaurant_id` (ví dụ menu theo sort order, table/session OPEN, order theo created time).

### Migration không mất dữ liệu

1. Thêm các cột `restaurant_id` nullable và index/FK chưa bắt buộc.
2. Tạo hoặc dùng quán Kim Thành hiện có làm tenant mặc định; backfill toàn bộ row hiện hữu và owner/staff hiện hữu vào đó.
3. Đối soát row không null, đổi cột sang `NOT NULL`; thay unique `dining_table.code` bằng `(restaurant_id, code)`.
4. Chỉ sau đó chuyển toàn bộ query/API sang bắt buộc tenant scope. Migration phải chạy trong transaction có kiểm tra số lượng trước/sau và có backup/restore rehearsal.

### Tenant context bất biến

- Admin/staff: JWT chứa `sub`, `role`, `restaurantId`; backend lấy `restaurantId` từ token, không lấy từ payload/path/query.
- Guest: `qrToken` global unique resolve `DiningTable.restaurantId`. Sau bootstrap, app gửi guest capability server ký kèm các request theo session; UUID `sessionId` không phải quyền truy cập.
- Write tạo `TableSession`, `Order`, `StaffCall`, idempotency record phải copy `restaurantId` từ entity cha trong transaction và kiểm tra chúng trùng nhau.
- Mọi read/update/delete phải lọc `id` **và** `restaurant_id`; không được `findUnique({ id })` rồi sửa mà chưa xác nhận tenant.
- Realtime chỉ publish/subscribe event theo `restaurantId`; không phát toàn cục.

---

## Entity

### `Restaurant`

Thông tin quán. MVP hiện có một bản ghi; target multi-tenant có một bản ghi cho mỗi quán độc lập.

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string (uuid) | |
| `name` | string | "Quán Cơm Kim Thành" |
| `logoUrl` | string \| null | |
| `address` | string \| null | |
| `staffLoginCode` | string | **Target:** mã ngẫu nhiên unique để staff chọn đúng quán trước khi nhập PIN. |
| `trialEndsAt` | ISO datetime | Cố định lúc owner đăng ký, bằng ngày đăng ký + 2 tháng lịch. |
| `billingStatus` | `TRIAL` \| `ACTIVE` \| `GRACE` \| `PAST_DUE` \| `SUSPENDED` | Bản sao nhanh của lifecycle trên `Subscription`, dùng cho shell hiện hữu; `EntitlementService` là nguồn quyết định quyền. |

### `Plan`, `Subscription`, `SubscriptionCycle`

`Plan` là catalog global, hiện seed `starter-monthly` 100.000 VND/tháng với `featureLimits.orders = "unlimited"`. Mỗi `Restaurant` có đúng một `Subscription`, snapshot `priceVnd` và feature tại thời điểm bắt đầu; `SubscriptionCycle` lưu kỳ/amount/due/paid để giá gói đổi sau này không sửa lịch sử. Lifecycle là `TRIAL → GRACE → PAST_DUE`, hoặc `ACTIVE → GRACE → PAST_DUE`; webhook payment hợp lệ đưa `TRIAL`/`GRACE`/`PAST_DUE` về `ACTIVE`, còn `SUSPENDED` chỉ mở lại thủ công. `GRACE` kéo dài 7 × 24 giờ.

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

### `AuthUser`

Tài khoản nội bộ, không có tài khoản khách. `STAFF` chỉ có `pinHash`; `OWNER` chỉ có `email` và `passwordHash`. Hash dùng bcrypt; tuyệt đối không lưu PIN/mật khẩu thô. **Target:** thêm `restaurantId` bắt buộc; một tài khoản thuộc đúng một quán.

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
| `imageUrl` | string \| null | URL ảnh menu; BE-09 lưu local tại `/uploads/`, WebP 480 × 270 |
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
type UserRole        = 'STAFF' | 'OWNER'
type BillingStatus   = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'PAST_DUE' | 'SUSPENDED'
type SubscriptionCycleStatus = 'PENDING' | 'PAID' | 'VOID'
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

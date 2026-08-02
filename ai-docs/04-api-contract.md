# 04 — API contract

**File này là hợp đồng ràng buộc.** `packages/mock/src/handlers.ts` (giai đoạn UI) và `tableqr-api` (M6) đều phải khớp 1:1 với nó. Sửa contract ⇒ sửa cả hai nơi ⇒ cập nhật file này trong cùng một lần thay đổi.

- Base URL: `/api/v1`
- Content type: `application/json; charset=utf-8`
- Thời gian: chuỗi ISO 8601 UTC (`2026-08-01T10:15:30.000Z`)
- Tiền: số nguyên VND

## Xác thực

| Nhóm | Cách xác thực |
| --- | --- |
| `/guest/*` | **Không đăng nhập.** Định danh bằng `qrToken` trên URL + header `X-Guest-Token` (uuid do client sinh, lưu `sessionStorage`) |
| `/staff/*` | `Authorization: Bearer <token>`, role `staff` hoặc `owner` |
| `/admin/*` | `Authorization: Bearer <token>`, role `owner` |

## Dạng lỗi chung

```json
{
  "error": {
    "code": "TABLE_NOT_FOUND",
    "message": "Mã QR không hợp lệ, vui lòng gọi nhân viên.",
    "details": null
  }
}
```

`message` là **tiếng Việt, hiển thị thẳng cho người dùng**. FE ưu tiên dùng `message` từ server; chỉ tự chế chuỗi khi mất mạng hoàn toàn.

| `code` | HTTP | Khi nào |
| --- | --- | --- |
| `TABLE_NOT_FOUND` | 404 | `qrToken` sai hoặc bàn `isActive=false` |
| `SESSION_CLOSED` | 409 | Nhân viên đã Reset bàn trong lúc khách đang thao tác |
| `ITEMS_UNAVAILABLE` | 409 | Có món trong đơn đã hết hàng (`details.unavailableItemIds`) |
| `EMPTY_ORDER` | 400 | Gửi đơn không có món nào |
| `INVALID_TRANSITION` | 409 | Chuyển trạng thái đơn sai luồng |
| `UNAUTHORIZED` | 401 | Thiếu / sai token |
| `FORBIDDEN` | 403 | Sai role |
| `VALIDATION_ERROR` | 400 | Payload sai định dạng (`details.fields`) |

---

# Guest — không đăng nhập

### `GET /api/v1/guest/tables/:qrToken`

Mở (hoặc gắn vào) phiên bàn và trả về mọi thứ app khách cần cho lần vẽ đầu tiên. **Một request duy nhất** — vì mỗi round-trip trên 4G yếu là ~300ms.

> Side effect: nếu bàn đang `EMPTY`, tạo `TableSession` mới. Nếu đã có session `OPEN`, gắn khách vào session đó. Dùng `GET` là cố ý, đổi lại được một lần round-trip; hành vi là idempotent theo bàn.

**200**
```json
{
  "restaurant": { "id": "...", "name": "Quán Cơm Kim Thành", "logoUrl": null },
  "table": { "id": "...", "code": "B01", "displayName": "Bàn 1" },
  "session": { "id": "...", "status": "OPEN", "openedAt": "2026-08-01T10:00:00.000Z" },
  "categories": [
    { "id": "...", "name": "Đồ uống", "sortOrder": 1 }
  ],
  "items": [
    {
      "id": "...", "categoryId": "...", "name": "Cà phê sữa đá",
      "description": "Cà phê phin truyền thống",
      "priceVnd": 25000, "imageUrl": "/images/ca-phe-sua-da.jpg",
      "isAvailable": true, "sortOrder": 1
    }
  ]
}
```
**404** `TABLE_NOT_FOUND`

---

### `GET /api/v1/guest/sessions/:sessionId/orders`

Các lần đã gọi trong phiên + tổng tiền cộng dồn.

**200**
```json
{
  "session": { "id": "...", "status": "OPEN", "totalVnd": 145000 },
  "orders": [
    {
      "id": "...", "sequenceNo": 1, "status": "SERVED",
      "createdAt": "2026-08-01T10:05:00.000Z", "note": null,
      "totalVnd": 95000,
      "items": [
        {
          "id": "...", "menuItemId": "...", "nameSnapshot": "Cà phê sữa đá",
          "unitPriceVndSnapshot": 25000, "quantity": 2, "note": "ít đá",
          "lineTotalVnd": 50000
        }
      ]
    }
  ]
}
```
**409** `SESSION_CLOSED`

---

### `POST /api/v1/guest/sessions/:sessionId/orders`

Gửi đơn. Đây là endpoint quan trọng nhất của hệ thống.

**Request**
```json
{
  "note": null,
  "items": [
    { "menuItemId": "...", "quantity": 2, "note": "ít đá" },
    { "menuItemId": "...", "quantity": 1, "note": null }
  ]
}
```

Server tự snapshot `nameSnapshot` + `unitPriceVndSnapshot` từ `MenuItem` hiện tại — **client không được gửi giá lên**, nếu không khách sửa được giá bằng DevTools.

**201** — trả về đúng shape một `order` như ở endpoint trên.

**400** `EMPTY_ORDER` · **409** `SESSION_CLOSED` · **409** `ITEMS_UNAVAILABLE`
```json
{
  "error": {
    "code": "ITEMS_UNAVAILABLE",
    "message": "Món \"Bún bò Huế\" vừa hết. Vui lòng chọn món khác.",
    "details": { "unavailableItemIds": ["..."] }
  }
}
```

**Idempotency:** client gửi kèm header `X-Request-Id` (uuid). Server nhận lại cùng `X-Request-Id` trong 60s thì trả về đơn đã tạo thay vì tạo đơn thứ hai. Chống double-submit khi khách bấm hai lần vì mạng chậm.

---

### `POST /api/v1/guest/sessions/:sessionId/calls`

Gọi nhân viên / xin tính tiền.

**Request** `{ "type": "CALL_STAFF" }` hoặc `{ "type": "REQUEST_BILL" }`

**201**
```json
{ "id": "...", "type": "CALL_STAFF", "status": "PENDING", "createdAt": "..." }
```

Nếu đã có `StaffCall` `PENDING` cùng `type` trong phiên thì trả về chính bản ghi đó (200) — khách bấm 5 lần không tạo 5 thông báo.

---

# Staff — bếp / quầy

### `POST /api/v1/staff/auth/login`
Request `{ "pin": "123456" }` → **200** `{ "token": "...", "role": "staff", "displayName": "Nhân viên quầy" }` · **401** `UNAUTHORIZED`

### `GET /api/v1/staff/orders?status=&since=`

Bảng đơn. `since` (ISO datetime) để polling lấy phần thay đổi; bỏ trống thì lấy đơn của các phiên đang `OPEN`.

**200**
```json
{
  "serverTime": "2026-08-01T10:20:00.000Z",
  "orders": [
    {
      "id": "...", "sequenceNo": 2, "status": "NEW",
      "createdAt": "2026-08-01T10:18:00.000Z", "note": null, "totalVnd": 50000,
      "table": { "id": "...", "code": "B01", "displayName": "Bàn 1" },
      "sessionId": "...",
      "items": [ { "nameSnapshot": "Cà phê sữa đá", "quantity": 2, "note": "ít đá", "unitPriceVndSnapshot": 25000, "lineTotalVnd": 50000 } ]
    }
  ]
}
```

`serverTime` dùng làm `since` cho lần polling kế tiếp — không dùng đồng hồ máy khách vì có thể lệch.

### `PATCH /api/v1/staff/orders/:orderId/status`
Request `{ "status": "PREPARING" }` → **200** order · **409** `INVALID_TRANSITION`

### `GET /api/v1/staff/tables`
**200**
```json
{
  "tables": [
    {
      "id": "...", "code": "B01", "displayName": "Bàn 1", "status": "OCCUPIED", "sortOrder": 1,
      "session": { "id": "...", "openedAt": "...", "totalVnd": 145000, "orderCount": 2, "paidAt": null }
    },
    { "id": "...", "code": "B02", "displayName": "Bàn 2", "status": "EMPTY", "sortOrder": 2, "session": null }
  ]
}
```

### `GET /api/v1/staff/sessions/:sessionId`
Chi tiết phiên: tất cả các lần gọi + tổng bill. Shape giống `GET /guest/sessions/:id/orders` cộng thêm `table` và `paidAt`.

### `POST /api/v1/staff/sessions/:sessionId/pay`
Đánh dấu đã thanh toán → **200** `{ "id": "...", "paidAt": "..." }`

### `POST /api/v1/staff/sessions/:sessionId/close`
**Reset bàn.** Đặt `status=CLOSED`, `closedAt`, bàn về `EMPTY`. Không xoá đơn.
**200** `{ "id": "...", "status": "CLOSED", "closedAt": "..." }`

### `GET /api/v1/staff/calls?status=PENDING`
**200** `{ "calls": [ { "id": "...", "type": "REQUEST_BILL", "status": "PENDING", "createdAt": "...", "table": { "code": "B01", "displayName": "Bàn 1" } } ] }`

### `PATCH /api/v1/staff/calls/:callId`
Request `{ "status": "DONE" }` → **200**

### `GET /api/v1/staff/stream` — **chỉ từ M7**
SSE. Event: `order.created`, `order.status_changed`, `call.created`, `session.closed`. Data là payload cùng shape với các endpoint tương ứng. Giai đoạn mock (M2–M5) **không** có endpoint này; client dùng polling `GET /staff/orders?since=`.

---

# Admin — chủ quán

### `POST /api/v1/admin/auth/login`
Request `{ "email": "...", "password": "..." }` → **200** `{ "token": "...", "role": "owner", "displayName": "..." }`

### Danh mục
| Method | Path | Ghi chú |
| --- | --- | --- |
| `GET` | `/admin/categories` | Gồm cả danh mục `isActive=false` |
| `POST` | `/admin/categories` | `{ name, sortOrder }` |
| `PATCH` | `/admin/categories/:id` | `{ name?, sortOrder?, isActive? }` |
| `DELETE` | `/admin/categories/:id` | **409** nếu còn món bên trong |

### Món ăn
| Method | Path | Ghi chú |
| --- | --- | --- |
| `GET` | `/admin/items?categoryId=` | Gồm cả món `isAvailable=false` |
| `POST` | `/admin/items` | `{ categoryId, name, description, priceVnd, imageUrl, sortOrder }` |
| `PATCH` | `/admin/items/:id` | Mọi trường optional; dùng cả cho toggle nhanh `{ isAvailable }` |
| `DELETE` | `/admin/items/:id` | Soft delete — đơn cũ đã snapshot nên không ảnh hưởng |

### Bàn
| Method | Path | Ghi chú |
| --- | --- | --- |
| `GET` | `/admin/tables` | Trả kèm `qrToken` và `qrUrl` dựng sẵn |
| `POST` | `/admin/tables` | `{ code, displayName, sortOrder }` — server sinh `qrToken` |
| `PATCH` | `/admin/tables/:id` | `{ code?, displayName?, sortOrder?, isActive? }`. **Không cho đổi `qrToken`** (mã đã dán lên bàn rồi). |
| `DELETE` | `/admin/tables/:id` | **409** nếu bàn có session `OPEN` |

`qrUrl` = `<GUEST_BASE_URL>/t/<qrToken>`. `GUEST_BASE_URL` là biến cấu hình, không hardcode.

### `GET` / `PATCH` `/api/v1/admin/restaurant`
`{ name, logoUrl, address }`

---

---

## Trường rẻ ở mock nhưng đắt ở SQL

Đây là chỗ nguy hiểm nhất của cách làm UI-trước-BE-sau: mock tính mọi thứ bằng `reduce()` trên mảng trong bộ nhớ nên **không tốn gì**, còn API thật phải đi qua nhiều bảng. Nếu không chặn từ bây giờ thì tới M6 mới phát hiện là phải đổi cả contract.

| Endpoint | Trường | Chi phí thật | Bắt buộc làm |
| --- | --- | --- | --- |
| `GET /staff/tables` | `session.totalVnd`, `session.orderCount` cho **mọi** bàn | Mỗi bàn → session → orders → order_items. Naive Prisma `include` là **N+1 trên 8–20 bàn**, mà endpoint này **bị poll liên tục** | Một truy vấn `GROUP BY session_id` duy nhất rồi ghép trong bộ nhớ. **Không** dùng nested include. Nếu vẫn chậm: thêm cột `table_session.total_vnd_cached` cập nhật khi tạo/huỷ đơn |
| `GET /staff/orders` | `items[]` + `table` lồng trong mỗi đơn | Join 3 bảng | Chấp nhận được — có index `order(created_at)` và lọc theo session `OPEN`. Phải có `LIMIT`. |
| `GET /guest/tables/:qrToken` | Toàn bộ menu trong một response | Quán 100 món ⇒ payload lớn | Đo ở M6. Vượt ~80 KB thì tách `items` sang endpoint riêng có cache — **đổi contract thì đổi luôn ở M6, không để tới M7** |

**Quy tắc chung:** mọi trường dẫn xuất trong contract phải trả lời được câu *"một truy vấn SQL nào sinh ra nó?"*. Không trả lời được thì hoặc đổi shape, hoặc denormalize — quyết ở M6, ghi lại lý do.

### Hai điểm cần xem lại ở M6

1. **`GET /guest/tables/:qrToken` có side effect** (tạo `TableSession`). Cố ý, để tiết kiệm một round-trip trên 4G. Rủi ro thật: trình duyệt hoặc app quét QR **prefetch** URL sẽ mở phiên trước khi khách kịp nhìn màn hình ⇒ bàn thành `OCCUPIED` sớm. Hệ quả nhẹ (nhân viên reset là xong) nhưng phải kiểm bằng thiết bị thật ở `BE-13`. Nếu phiền: tách thành `GET` thuần + `POST /guest/sessions` gọi ngầm sau khi render.
2. **Idempotency `X-Request-Id`**: mock giả lập được dễ dàng bằng một `Map`. API thật cần **unique index + transaction**, không phải cache trong RAM — nếu chạy nhiều instance thì cache RAM vô dụng.

---

## Bảng đối chiếu — dùng khi verify M1

| # | Endpoint | Handler mock | Màn hình dùng |
| --- | --- | --- | --- |
| 1 | `GET /guest/tables/:qrToken` | ✔ | guest `/t/:qrToken` |
| 2 | `GET /guest/sessions/:id/orders` | ✔ | guest `/orders` |
| 3 | `POST /guest/sessions/:id/orders` | ✔ | guest `/cart` |
| 4 | `POST /guest/sessions/:id/calls` | ✔ | guest nút nổi |
| 5 | `POST /staff/auth/login` | ✔ | staff `/login` |
| 6 | `GET /staff/orders` | ✔ | staff `/orders` |
| 7 | `PATCH /staff/orders/:id/status` | ✔ | staff `/orders` |
| 8 | `GET /staff/tables` | ✔ | staff `/tables` |
| 9 | `GET /staff/sessions/:id` | ✔ | staff `/tables/:code` |
| 10 | `POST /staff/sessions/:id/pay` | ✔ | staff `/tables/:code` |
| 11 | `POST /staff/sessions/:id/close` | ✔ | staff `/tables/:code` |
| 12 | `GET /staff/calls` | ✔ | staff header |
| 13 | `PATCH /staff/calls/:id` | ✔ | staff header |
| 14 | `POST /admin/auth/login` | ✔ | admin `/login` |
| 15–18 | `/admin/categories` CRUD | ✔ | admin `/menu` |
| 19–22 | `/admin/items` CRUD | ✔ | admin `/menu` |
| 23–26 | `/admin/tables` CRUD | ✔ | admin `/tables` |
| 27–28 | `/admin/restaurant` GET+PATCH | ✔ | admin `/settings` |
| 29 | `GET /staff/stream` (SSE) | — M7 | staff realtime |

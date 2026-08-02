# 07 — `tableqr-admin` (M4)

App chủ quán. Dùng chủ yếu **trước giờ mở cửa** (nhập menu, in QR) và **thỉnh thoảng trong ca** (bật/tắt hết món). Desktop-first.

Đọc trước: `ai-docs/01` (§2), `ai-docs/04` (§Admin), `ai-docs/05` (§tableqr-admin), `ai-docs/07` (A7, A8).

Phụ thuộc: M3 xong.

> **Giao diện đã dựng sẵn ở [`prototype/`](../prototype/README.md) và người dùng đã duyệt — không thiết kế lại.** Mở màn tương ứng, bấm thử hết tương tác, rồi dựng lại bằng React.
> Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước: cái gì copy nguyên, cái gì tuyệt đối không port, chỗ nào prototype làm tắt mà React phải làm đủ.

---

### `AD-00` — Khởi tạo app + shell · DONE

Vite + React + TS, cổng 5175. Sidebar trái: **Menu · Bàn & mã QR · Cài đặt**. Thu gọn sidebar trên màn hẹp. `.env.example` thêm `VITE_GUEST_BASE_URL`.

**Kết quả:** `tableqr-admin` có Vite/React/TS, mock worker, Query/Router, shell sidebar responsive và routes placeholder `/menu`, `/tables`, `/tables/print`, `/settings`; `.env.example` có guest base URL. Lint/typecheck/build sạch, initial JS 63,90 KB gzip.

### `AD-01` — Đăng nhập · TODO

`/login` email + mật khẩu → `POST /admin/auth/login`. Token `localStorage`, route guard, nút Đăng xuất.

### `AD-02` — Danh sách danh mục · TODO

**Prototype:** `prototype/admin-menu.html (cột trái)`

`/menu` cột trái: danh sách danh mục, số món mỗi danh mục, danh mục `isActive=false` hiện mờ. Thêm / sửa tên / bật-tắt / xoá. **Xoá danh mục còn món → server trả 409, hiện đúng `message`.** Kéo thả đổi `sortOrder` (lưu ngay).

### `AD-03` — Danh sách món · TODO

**Prototype:** `prototype/admin-menu.html (cột phải)`

`/menu` cột phải: món của danh mục đang chọn. Mỗi dòng: thumbnail, tên, giá, **công tắc "Còn hàng"**, nút Sửa / Xoá.

Công tắc "Còn hàng" là thao tác dùng nhiều nhất trong ngày — **đổi là lưu ngay** (`PATCH /admin/items/:id` với cập nhật lạc quan), không bắt mở form, không có nút Lưu. Kéo thả đổi `sortOrder`.

### `AD-04` — Form món · TODO

**Prototype:** `prototype/admin-menu.html (modal — bấm nút sửa)`

`/menu/items/new` và `/menu/items/:id`. Trường: danh mục · tên (bắt buộc) · mô tả · **giá** (nhập số nguyên, hiện `45.000 ₫` ngay dưới ô) · URL ảnh · còn hàng · thứ tự.

Validate phía client trước khi gửi; lỗi `VALIDATION_ERROR` từ server thì gắn vào đúng field theo `details.fields`. Rời trang khi chưa lưu → hỏi xác nhận.

Giai đoạn mock chưa có upload ảnh — nhập URL, gợi ý sẵn các ảnh có trong `packages/mock/assets/`. Upload thật là `BE-09`.

### `AD-05` — Quản lý bàn · TODO

**Prototype:** `prototype/admin-tables.html`

`/tables`: bảng mã / tên hiển thị / trạng thái / thao tác. Thêm bàn (server sinh `qrToken`), sửa `code`, `displayName`, `sortOrder`, `isActive`.

**Không có UI nào cho phép đổi `qrToken`** — mã đã in và dán lên bàn rồi. Xoá bàn đang có khách → 409, hiện `message`.

### `AD-06` — Xem mã QR một bàn · TODO

**Prototype:** `prototype/admin-tables.html (modal — nút Xem mã QR)`

Nút "Xem mã QR" mở modal: QR render bằng `qrcode.react` từ `qrUrl` (= `VITE_GUEST_BASE_URL` + `/t/` + `qrToken`), tên bàn bên dưới, nút **Tải PNG**.

Bắt buộc kiểm tra bằng camera điện thoại thật, không chỉ nhìn ảnh.

### `AD-07` — Trang in mã QR hàng loạt · TODO

**Prototype:** `prototype/admin-print.html`

`/tables/print`, không sidebar. Lưới A4 3×4 mỗi trang. Mỗi ô: mã QR + **tên bàn chữ to** + tên quán + dòng nhỏ *"Quét mã để xem menu và gọi món"*.

CSS `@media print`: ẩn mọi thứ ngoài lưới, `page-break-after` đúng chỗ, chừa lề an toàn để cắt không phạm chữ. Chọn lọc bàn cần in (mặc định tất cả bàn `isActive`).

Kiểm tra bằng **Print Preview thật**, không đoán.

### `AD-08` — Cài đặt quán · TODO

**Prototype:** `prototype/admin-settings.html`

`/settings`: tên quán, logo (URL), địa chỉ. `GET`/`PATCH /admin/restaurant`. Đổi tên quán → app khách hiện tên mới sau reload.

---

## Kiểm tra khi hết M4

```bash
pnpm dev:admin      # http://localhost:5175
```

Đi hết A7, A8 của `ai-docs/07`, thêm:
- Thêm món ở admin → reload app khách (5173) thấy món đó *(chỉ chạy khi hai app dùng chung một store — nếu mock còn tách theo origin thì kiểm tra bằng cách sửa fixture, và xác nhận lại đầy đủ ở M7)*
- `/tables/print` → Print Preview: đúng số ô, không dính chữ khi cắt
- Sửa tên bàn → mở lại modal QR → `qrToken` **không đổi**

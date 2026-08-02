# 05 — `tableqr-guest` (M2)

App khách. **Quan trọng nhất trong hệ thống** — đây là thứ khách hàng thật chạm vào, và là nơi ngân sách hiệu năng siết chặt nhất.

Đọc trước: `ai-docs/01` (luồng khách), `ai-docs/04` (§Guest), `ai-docs/05` (§tableqr-guest), `ai-docs/07` (mục A1–A4, B).

Phụ thuộc: M1 xong (`WS-01`…`WS-04`).

> **Giao diện đã dựng sẵn ở [`prototype/`](../prototype/README.md) và người dùng đã duyệt — không thiết kế lại.** Mở màn tương ứng, bấm thử hết tương tác, rồi dựng lại bằng React.
> Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước: cái gì copy nguyên, cái gì tuyệt đối không port, chỗ nào prototype làm tắt mà React phải làm đủ.

---

### `GU-00` — Khởi tạo app · TODO

Vite + React + TS, cổng 5173. Nạp `@kimthanh-tableqr/ui` (`theme.css` + Tailwind v4), TanStack Query provider, react-router. Bật MSW qua dynamic import trong `main.tsx`, **await trước khi render** (xem `ai-docs/06`). `.env.example`. Error boundary toàn app.

Xong khi: `pnpm dev:guest` mở ra trang trắng có style, DevTools thấy MSW đã đăng ký.

### `GU-01` — Router + shell + tải phiên bàn · TODO

Route: `/t/:qrToken`, `/t/:qrToken/item/:itemId`, `/t/:qrToken/cart`, `/t/:qrToken/orders`, `/t/:qrToken/success`, `/t/invalid`, `*` → invalid.

Hook `useTableSession(qrToken)` gọi `GET /guest/tables/:qrToken`, cache bằng TanStack Query. Sinh `guestToken` (uuid) lưu `sessionStorage`, gắn vào header `X-Guest-Token` trong `apiClient`. Lỗi `TABLE_NOT_FOUND` → chuyển `/t/invalid`. Code splitting: `/cart` và `/orders` tải lười.

Header hiện tên quán + số bàn.

### `GU-02` — Màn menu · TODO

**Prototype:** `prototype/guest-menu.html`

Danh sách món nhóm theo danh mục. Tab danh mục cuộn ngang, dính dưới header, tab hiện hành tô đậm theo vị trí cuộn (IntersectionObserver). Card món theo `ai-docs/05`. Nút `+` thêm nhanh 1 món. Món `isAvailable=false`: mờ 45%, badge "Hết món", không tương tác.

Ảnh: `loading="lazy"`, `width`/`height` cố định, nền placeholder — **CLS phải < 0.1**.

Skeleton lúc tải; state lỗi có nút thử lại.

### `GU-03` — Tìm kiếm món · TODO

**Prototype:** `prototype/guest-menu.html (ô tìm kiếm)`

Ô tìm kiếm lọc tại chỗ theo tên. **Bỏ dấu tiếng Việt khi so khớp**: gõ "ca phe" ra "Cà phê sữa đá". Viết hàm `removeVietnameseTones()` trong `packages/contracts` + test. Không kết quả → empty state "Không tìm thấy món nào" + nút xoá tìm kiếm.

### `GU-04` — Bottom sheet chi tiết món · TODO

**Prototype:** `prototype/guest-menu.html (bottom sheet — bấm vào thẻ món)`

Sheet trượt từ dưới, nền mờ, vuốt xuống / chạm nền / `Esc` để đóng. **Bẫy focus, trả focus về card đã mở.** Ảnh lớn, mô tả, bộ đếm số lượng, ô ghi chú + chip gợi ý (`ít đá`, `không rau`, `thêm ớt`, `ít cay`, `không hành`). Nút `Thêm vào giỏ · 50.000 ₫` cập nhật tiền theo số lượng.

Đóng sheet phải quay về đúng vị trí cuộn cũ trong menu.

### `GU-05` — Trạng thái giỏ hàng · TODO

**Prototype:** `prototype/guest-menu.html + guest-cart.html`

`features/cart/` — context + reducer. Giỏ nằm ở client, lưu `sessionStorage` theo `sessionId`.

Quy tắc gộp: **cùng `menuItemId` + cùng `note` → cộng số lượng; khác `note` → tách thành hai dòng.**

Hàm thuần trong `packages/contracts/src/totals.ts`, có test: `calcLineTotal`, `calcCartTotal`. Thanh giỏ nổi hiện số món + tổng tiền, chỉ hiện khi giỏ > 0.

### `GU-06` — Màn giỏ hàng + Gửi đơn · TODO

**Prototype:** `prototype/guest-cart.html`

Danh sách món, bộ đếm số lượng, xoá (giảm về 0 = xoá + snackbar Hoàn tác), sửa ghi chú tại chỗ. Tổng tiền. Nút Gửi đơn rộng hết ngang.

`POST /guest/sessions/:id/orders` kèm header `X-Request-Id` (uuid mỗi lần bấm) — **chống double-submit**. Nút vào trạng thái loading và chặn bấm lần hai. Thành công → xoá giỏ → `/success`.

Xử lý lỗi:
- `ITEMS_UNAVAILABLE` → giữ giỏ, đánh dấu đỏ đúng món trong `details.unavailableItemIds`, hiện `message` của server
- `SESSION_CLOSED` → màn "Phiên đã kết thúc, quét lại mã QR"
- Mất mạng → "Không có kết nối mạng" + nút Thử lại, **giỏ giữ nguyên**

### `GU-07` — Màn xác nhận đã gửi · TODO

**Prototype:** `prototype/guest-success.html`

Dấu tích, "Đã gửi đơn tới bếp", tóm tắt đơn vừa gửi. Tự chuyển `/orders` sau 3s, có nút bỏ qua chờ.

### `GU-08` — Màn đơn của bàn (gọi thêm món) · TODO

**Prototype:** `prototype/guest-orders.html`

`GET /guest/sessions/:id/orders`, poll mỗi 10s để badge trạng thái tự cập nhật. Mỗi lần gọi là một thẻ: "Lần gọi #N · 10:05" + badge + món + thành tiền.

**Tổng cộng cả phiên** chữ to ở cuối — cộng dồn mọi đơn không `CANCELLED`. Nút `Gọi thêm món` (về menu, giỏ rỗng) và `Xin tính tiền`.

Đây là task hiện thực yêu cầu MVP "gọi thêm món nhiều lần" — kiểm kỹ theo A2 của `ai-docs/07`.

### `GU-09` — Nút nổi Gọi nhân viên · TODO

**Prototype:** `prototype/guest-menu.html (nút chuông góc phải dưới)`

Nút tròn góc phải dưới (không che thanh giỏ hàng). Chạm mở 2 lựa chọn: Gọi nhân viên / Xin tính tiền → `POST /guest/sessions/:id/calls`. Sau khi gửi, nút đổi "Đã báo nhân viên ✓" và khoá 30 giây.

### `GU-10` — Trạng thái lỗi & màn hình biên · TODO

**Prototype:** `prototype/guest-invalid.html (3 biến thể)`

`/t/invalid`; màn "Phiên đã kết thúc"; xử lý offline toàn app; skeleton cho mọi màn gọi dữ liệu. Rà lại toàn bộ chuỗi tiếng Việt — không để lọt tiếng Anh.

---

## Kiểm tra khi hết M2

```bash
pnpm dev:guest      # http://localhost:5173/t/<qrToken trong packages/mock/src/fixtures.ts>
```

Đi hết A1–A4 của `ai-docs/07`, thêm:
- DevTools → iPhone SE 375px: không tràn ngang, chạm được bằng ngón cái
- Slow 4G + CPU 4×: menu hiện < 3s
- `pnpm --filter tableqr-guest build` → bundle initial < 150 KB gzip

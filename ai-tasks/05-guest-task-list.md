# 05 — `tableqr-guest` (M2)

App khách. **Quan trọng nhất trong hệ thống** — đây là thứ khách hàng thật chạm vào, và là nơi ngân sách hiệu năng siết chặt nhất.

Đọc trước: `ai-docs/01` (luồng khách), `ai-docs/04` (§Guest), `ai-docs/05` (§tableqr-guest), `ai-docs/07` (mục A1–A4, B).

Phụ thuộc: M1 xong (`WS-01`…`WS-04`).

> **Giao diện đã dựng sẵn ở [`prototype/`](../prototype/README.md) và người dùng đã duyệt — không thiết kế lại.** Mở màn tương ứng, bấm thử hết tương tác, rồi dựng lại bằng React.
> Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước: cái gì copy nguyên, cái gì tuyệt đối không port, chỗ nào prototype làm tắt mà React phải làm đủ.

---

### `GU-00` — Khởi tạo app · **DONE** (2026-08-02)

Vite + React + TS, cổng 5173. Nạp `@kimthanh-tableqr/ui` (`theme.css` + Tailwind v4), TanStack Query provider, react-router. Bật MSW qua dynamic import trong `main.tsx`, **await trước khi render** (xem `ai-docs/06`). `.env.example`. Error boundary toàn app.

Xong khi: `pnpm dev:guest` mở ra trang trắng có style, DevTools thấy MSW đã đăng ký.

**Kết quả:** tạo Vite 5 + React 18 + TypeScript app ở cổng 5173; nạp Tailwind v4 và `@kimthanh-tableqr/ui/theme.css`; có React Router, TanStack Query provider và error boundary toàn app. MSW được dynamic import rồi `await` trước render; dev script tự sinh worker bị gitignore, production build không chứa chunk MSW. Có `.env.example` và mặc định development chạy mock. Lint/typecheck/build sạch; workspace 61/61 test pass; bundle khởi tạo 57,18 KB gzip.

### `GU-01` — Router + shell + tải phiên bàn · **DONE** (2026-08-02)

Route: `/t/:qrToken`, `/t/:qrToken/item/:itemId`, `/t/:qrToken/cart`, `/t/:qrToken/orders`, `/t/:qrToken/success`, `/t/invalid`, `*` → invalid.

Hook `useTableSession(qrToken)` gọi `GET /guest/tables/:qrToken`, cache bằng TanStack Query. Sinh `guestToken` (uuid) lưu `sessionStorage`, gắn vào header `X-Guest-Token` trong `apiClient`. Lỗi `TABLE_NOT_FOUND` → chuyển `/t/invalid`. Code splitting: `/cart` và `/orders` tải lười.

Header hiện tên quán + số bàn.

**Kết quả:** đủ route `/t/:qrToken`, `/t/:qrToken/item/:itemId`, `/t/:qrToken/cart`, `/t/:qrToken/orders`, `/t/:qrToken/success`, `/t/invalid` và `*` → invalid. `apiClient` tự sinh/lưu `guestToken` UUID trong `sessionStorage` và gắn `X-Guest-Token`; `useTableSession(qrToken)` tải `GET /guest/tables/:qrToken` qua TanStack Query. Shell bám prototype, hiện tên quán + bàn. `TABLE_NOT_FOUND` chuyển `/t/invalid`. `/cart` và `/orders` tách chunk lazy. Lint/build sạch; initial JS 69,16 KB gzip.

### `GU-02` — Màn menu · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-menu.html`

Danh sách món nhóm theo danh mục. Tab danh mục cuộn ngang, dính dưới header, tab hiện hành tô đậm theo vị trí cuộn (IntersectionObserver). Card món theo `ai-docs/05`. Nút `+` thêm nhanh 1 món. Món `isAvailable=false`: mờ 45%, badge "Hết món", không tương tác.

Ảnh: `loading="lazy"`, `width`/`height` cố định, nền placeholder — **CLS phải < 0.1**.

Skeleton lúc tải; state lỗi có nút thử lại.

**Kết quả:** render menu từ bootstrap, nhóm/sắp xếp theo danh mục và `sortOrder`; tab danh mục sticky, cuộn ngang, đổi active theo `IntersectionObserver` và cuộn mượt tới nhóm. Card món bám prototype, giữ kích thước ảnh 88×88 với `loading="lazy"`/placeholder; món hết hàng opacity 45%, badge và khóa tương tác. Nút `+` tăng số lượng đã chọn ngay trên card; phần lưu giỏ theo phiên sẽ được nối tại `GU-05`. Skeleton và lỗi dùng state của table-session route; empty state đủ khi quán chưa có menu. Lint/typecheck/build sạch, initial JS 70,30 KB gzip.

### `GU-03` — Tìm kiếm món · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-menu.html (ô tìm kiếm)`

Ô tìm kiếm lọc tại chỗ theo tên. **Bỏ dấu tiếng Việt khi so khớp**: gõ "ca phe" ra "Cà phê sữa đá". Viết hàm `removeVietnameseTones()` trong `packages/contracts` + test. Không kết quả → empty state "Không tìm thấy món nào" + nút xoá tìm kiếm.

**Kết quả:** thêm ô tìm kiếm sticky, lọc cục bộ theo tên qua `removeVietnameseTones()` (đã có test ở contracts); nút xoá xuất hiện khi có từ khoá và trả focus về ô nhập. Danh mục/menu đồng bộ với kết quả lọc; không có kết quả hiện state tiếng Việt cùng nút xoá tìm kiếm. Lint/typecheck/build sạch, initial JS 70,82 KB gzip.

### `GU-04` — Bottom sheet chi tiết món · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-menu.html (bottom sheet — bấm vào thẻ món)`

Sheet trượt từ dưới, nền mờ, vuốt xuống / chạm nền / `Esc` để đóng. **Bẫy focus, trả focus về card đã mở.** Ảnh lớn, mô tả, bộ đếm số lượng, ô ghi chú + chip gợi ý (`ít đá`, `không rau`, `thêm ớt`, `ít cay`, `không hành`). Nút `Thêm vào giỏ · 50.000 ₫` cập nhật tiền theo số lượng.

Đóng sheet phải quay về đúng vị trí cuộn cũ trong menu.

**Kết quả:** route item dùng cùng `MenuPage` để hiển thị sheet phủ menu. Sheet có ảnh 16:9/placeholder, mô tả, `QuantityStepper`, ghi chú và 5 chip gợi ý; CTA tính lại theo số lượng. Mở/đóng bằng scrim, `Esc`, vuốt xuống; `BottomSheet` dùng focus trap và tự trả focus về card. Lint/typecheck/build UI + guest sạch, initial JS 72,14 KB gzip.

### `GU-05` — Trạng thái giỏ hàng · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-menu.html + guest-cart.html`

`features/cart/` — context + reducer. Giỏ nằm ở client, lưu `sessionStorage` theo `sessionId`.

Quy tắc gộp: **cùng `menuItemId` + cùng `note` → cộng số lượng; khác `note` → tách thành hai dòng.**

Hàm thuần trong `packages/contracts/src/totals.ts`, có test: `calcLineTotal`, `calcCartTotal`. Thanh giỏ nổi hiện số món + tổng tiền, chỉ hiện khi giỏ > 0.

**Kết quả:** `CartProvider`/reducer dùng `addToCart`, `calcCartItemCount`, `calcCartTotal`; lưu `sessionStorage` theo session ID và hydrate lại khi mở app. Thêm nhanh và CTA sheet đều đi qua context, giữ ghi chú; thanh giỏ nổi chỉ hiện khi có món. Lint/typecheck/build sạch, initial JS 72,70 KB gzip.

### `GU-06` — Màn giỏ hàng + Gửi đơn · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-cart.html`

Danh sách món, bộ đếm số lượng, xoá (giảm về 0 = xoá + snackbar Hoàn tác), sửa ghi chú tại chỗ. Tổng tiền. Nút Gửi đơn rộng hết ngang.

`POST /guest/sessions/:id/orders` kèm header `X-Request-Id` (uuid mỗi lần bấm) — **chống double-submit**. Nút vào trạng thái loading và chặn bấm lần hai. Thành công → xoá giỏ → `/success`.

Xử lý lỗi:
- `ITEMS_UNAVAILABLE` → giữ giỏ, đánh dấu đỏ đúng món trong `details.unavailableItemIds`, hiện `message` của server
- `SESSION_CLOSED` → màn "Phiên đã kết thúc, quét lại mã QR"
- Mất mạng → "Không có kết nối mạng" + nút Thử lại, **giỏ giữ nguyên**

**Kết quả:** màn giỏ có tăng/giảm/xóa kèm snackbar Hoàn tác, sửa ghi chú inline với chip gợi ý, tổng tiền và empty state. `POST /guest/sessions/:id/orders` chỉ gửi item/quantity/note, thêm UUID `X-Request-Id`, khóa nút khi gửi và xóa giỏ sau thành công rồi tới success. Lỗi giữ giỏ; `ITEMS_UNAVAILABLE` tô đúng dòng; `SESSION_CLOSED` hiện state phiên đã kết thúc. Lint/typecheck/build sạch, initial JS 72,99 KB gzip.

### `GU-07` — Màn xác nhận đã gửi · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-success.html`

Dấu tích, "Đã gửi đơn tới bếp", tóm tắt đơn vừa gửi. Tự chuyển `/orders` sau 3s, có nút bỏ qua chờ.

**Kết quả:** lưu snapshot cart vừa gửi theo session để recap món/note/tổng tiền sau khi giỏ xóa; có dấu tích, đếm ngược 3 giây và nút mở đơn ngay. Lint/typecheck/build sạch, initial JS 73,40 KB gzip.

### `GU-08` — Màn đơn của bàn (gọi thêm món) · **DONE** (2026-08-02)

**Prototype:** `prototype/guest-orders.html`

`GET /guest/sessions/:id/orders`, poll mỗi 10s để badge trạng thái tự cập nhật. Mỗi lần gọi là một thẻ: "Lần gọi #N · 10:05" + badge + món + thành tiền.

**Tổng cộng cả phiên** chữ to ở cuối — cộng dồn mọi đơn không `CANCELLED`. Nút `Gọi thêm món` (về menu, giỏ rỗng) và `Xin tính tiền`.

Đây là task hiện thực yêu cầu MVP "gọi thêm món nhiều lần" — kiểm kỹ theo A2 của `ai-docs/07`.

**Kết quả:** `GET /guest/sessions/:id/orders` qua TanStack Query poll 10 giây; render mỗi lần gọi với thời gian, status badge, item/note/thành tiền và tổng phiên từ server. Có loading/error/empty, gọi thêm món về menu và nút xin tính tiền dành cho GU-09. Lint/typecheck/build sạch, initial JS 73,63 KB gzip.

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

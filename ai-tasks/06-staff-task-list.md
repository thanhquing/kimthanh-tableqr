# 06 — `tableqr-staff` (M3)

Màn hình bếp/quầy. Mở suốt ca, nhìn từ xa, chạm bằng tay bận. Ưu tiên: **chữ to, tương phản cao, nút lớn, không có thao tác nào cần chính xác**.

Đọc trước: `ai-docs/01` (§2), `ai-docs/04` (§Staff), `ai-docs/05` (§tableqr-staff), `ai-docs/07` (A5, A6).

Phụ thuộc: M2 xong (primitive ở `packages/ui` đã ổn định).

> **Giao diện đã dựng sẵn ở [`prototype/`](../prototype/README.md) và người dùng đã duyệt — không thiết kế lại.** Mở màn tương ứng, bấm thử hết tương tác, rồi dựng lại bằng React.
> Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước: cái gì copy nguyên, cái gì tuyệt đối không port, chỗ nào prototype làm tắt mà React phải làm đủ.

---

### `ST-00` — Khởi tạo app · **DONE** (2026-08-02)

Vite + React + TS, cổng 5174. Cùng cấu hình nền như `GU-00`. Layout tablet-first: shell có header + vùng nội dung, không sidebar.

**Kết quả:** tạo `tableqr-staff` với Vite/React/TypeScript, Tailwind + UI theme, mock worker trước render, React Query/Router, shell header tablet-first; cổng 5174. Lint/typecheck/build sạch, initial JS 61,99 KB gzip.

### `ST-01` — Đăng nhập PIN · **DONE** (2026-08-02)

**Prototype:** `prototype/staff-login.html`

`/login` với bàn phím số lớn (nút ≥ 64px), nhập PIN 6 số, hiện chấm tròn. `POST /staff/auth/login`. Token lưu `localStorage`, **giữ đăng nhập lâu** — không ai muốn đăng nhập lại giữa giờ cao điểm. Route guard chuyển hướng về `/login` khi 401. Nút Đăng xuất ở header.

**Kết quả:** `StaffAuthProvider` lưu `AuthResponse` trong `localStorage`; login keypad 64px tự gửi ở số thứ 6, hiện lỗi PIN, guard `/orders` và redirect login, header có logout. Lint/typecheck/build sạch, initial JS 62,77 KB gzip.

### `ST-02` — Hook realtime (polling) · **DONE** (2026-08-02)

`src/lib/realtime.ts` xuất `useOrderStream()`. Giai đoạn này: polling `GET /staff/orders?since=<serverTime lần trước>` mỗi 3s qua TanStack Query.

**Dùng `serverTime` từ response làm `since` lần sau**, không dùng đồng hồ máy khách (có thể lệch).

Thiết kế interface sao cho M7 thay bằng `EventSource` mà **không sửa component nào** — đây là mục đích chính của task này.

Kèm nút dev "Giả lập đơn mới" (chỉ hiện khi `VITE_USE_MOCK=true`) ghi thẳng vào mock store, để demo màn bếp mà không cần mở app khách. Cần vì mock store không chia sẻ được giữa các origin — xem `ai-docs/06` §Realtime.

**Kết quả:** `useOrderStream()` poll 3 giây, dùng `serverTime` làm cursor và merge update theo ID; interface tách polling để M7 thay SSE. Debug handler browser-only tạo order trong mock store; staff build sạch, mock 16/16 test pass.

### `ST-03` — Bảng đơn · **DONE** (2026-08-02)

**Prototype:** `prototype/staff-orders.html`

`/orders` — màn hình chính. Ba cột **Đơn mới / Đang làm / Đã phục vụ** trên tablet; một danh sách dọc nhóm theo trạng thái trên điện thoại.

Thẻ đơn theo `ai-docs/05`: **số bàn là chữ to nhất**, số lần gọi, giờ + "x phút trước" tự đếm, danh sách món với ghi chú thụt vào và nổi màu, tổng tiền, nút hành động chính.

- Sắp xếp `createdAt` tăng dần — **ai gửi trước hiện trước**
- Đơn `NEW` quá 10 phút → đồng hồ chuyển đỏ
- Đơn `NEW` vừa tới → viền nổi + nhấp nháy 3s
- Empty state: "Chưa có đơn nào. Đơn của khách sẽ hiện ở đây."

**Kết quả:** board dùng `useOrderStream`, ba cột tablet / một cột mobile, sắp thứ tự `createdAt` tăng. Card ưu tiên số bàn, có item/note/tổng, màu quá lâu và nháy đơn mới; loading/empty đầy đủ. Lint/typecheck/build sạch, initial JS 67,72 KB gzip.

### `ST-04` — Chuyển trạng thái đơn · **DONE** (2026-08-02)

**Prototype:** `prototype/staff-orders.html`

`PATCH /staff/orders/:id/status`. Nút chính đổi theo trạng thái: `NEW` → "Bắt đầu làm", `PREPARING` → "Đã phục vụ". Menu `⋯` chứa "Huỷ đơn" (có hộp xác nhận).

**Cập nhật lạc quan**: bấm là thẻ chuyển cột ngay; lỗi thì hoàn lại + toast. Chặn ở UI các chuyển trạng thái không hợp lệ (bảng ở `ai-docs/03`); nếu server vẫn trả `INVALID_TRANSITION` thì hiện `message` và refetch.

**Kết quả:** dùng `primaryNextStatus`/`primaryActionLabel` để chỉ hiện transition hợp lệ; PATCH cập nhật lạc quan qua `useOrderStream`, lỗi hoàn rollback + toast/refetch. Có nút hủy và modal xác nhận focus-trapped. Lint/typecheck/build sạch, initial JS 68,94 KB gzip.

### `ST-05` — Chuông báo đơn mới · **DONE** (2026-08-02)

**Prototype:** `prototype/staff-orders.html (nút loa trên header)`

Tiếng chuông ngắn khi có đơn mới (Web Audio, không tải file mp3 nặng). Nút bật/tắt tiếng ở header, lưu `localStorage`.

Lưu ý trình duyệt chặn autoplay: chỉ phát sau khi người dùng đã tương tác lần đầu; chưa tương tác thì hiện gợi ý "Chạm để bật âm báo".

**Kết quả:** `SoundProvider` tạo tiếng bíp Web Audio cho ID đơn mới sau poll đầu, mute lưu `localStorage`; header có toggle và gợi ý bật âm báo trước first interaction. Lint/typecheck/build sạch, initial JS 69,55 KB gzip.

### `ST-06` — Sơ đồ bàn · **DONE** (2026-08-02)

**Prototype:** `prototype/staff-tables.html`

`/tables` từ `GET /staff/tables`. Lưới thẻ bàn: trống = xám nhạt; có khách = tô màu + thời gian ngồi + số lần gọi + tổng tạm tính. **Chấm đỏ** nếu bàn có `StaffCall` `PENDING`. Chạm → `/tables/:code`.

**Kết quả:** query `GET /staff/tables`, render lưới responsive phân biệt bàn trống/có khách, thông tin phiên và chip khách gọi; bàn đang có phiên link tới route chi tiết. Lint/typecheck/build sạch, initial JS 70,69 KB gzip.

### `ST-07` — Chi tiết phiên + Đã thanh toán + Reset bàn · TODO

**Prototype:** `prototype/staff-session.html`

`/tables/:code` từ `GET /staff/sessions/:id`. Tất cả các lần gọi + **tổng bill chữ rất to** (nhân viên đọc để thu tiền).

1. **Đã thanh toán** → `POST /staff/sessions/:id/pay`, mở khoá nút dưới.
2. **Reset bàn** → hộp xác nhận với đúng câu ở `ai-docs/05`: *"Reset Bàn 1? Bàn sẽ về trạng thái trống, khách mới quét mã sẽ bắt đầu phiên mới. Đơn cũ vẫn được lưu lại."* → `POST /staff/sessions/:id/close` → về `/tables`.

Cho Reset khi chưa thanh toán (khách bỏ đi, vẫn phải dọn bàn) nhưng thêm một dòng cảnh báo đỏ.

Đơn `CANCELLED` **không** tính vào tổng — dùng `calcSessionTotal()` của `packages/contracts`, không cộng tay.

### `ST-08` — Thông báo gọi nhân viên · TODO

**Prototype:** `prototype/staff-orders.html (chuông trên header)`

Chuông trên header có badge số, từ `GET /staff/calls?status=PENDING` (chung chu kỳ polling với `ST-02`). Danh sách: "Bàn 3 · Xin tính tiền · 1 phút trước" + nút "Đã xử lý" → `PATCH /staff/calls/:id`. `REQUEST_BILL` nổi bật hơn `CALL_STAFF`.

### `ST-09` — (tuỳ chọn) Proxy cùng origin để demo sớm · TODO

Chỉ làm nếu cần demo luồng khách→bếp trước M7. Thêm `server.proxy` vào `vite.config.ts` của guest để phục vụ staff/admin dưới cùng origin, rồi cho mock store đồng bộ qua `BroadcastChannel`. Không làm cũng không chặn mốc nào.

---

## Kiểm tra khi hết M3

```bash
pnpm dev:staff      # http://localhost:5174
```

Đi hết A5, A6 của `ai-docs/07`, thêm:
- Tablet ngang 1024px: đọc được thoải mái từ 80cm
- Điện thoại 375px: vẫn dùng được (1 cột)
- Đóng tab 5 phút rồi mở lại: vẫn đăng nhập, đơn cập nhật lại đúng

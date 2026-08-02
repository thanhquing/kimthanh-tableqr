# 02 — Backlog tổng

Bảng trạng thái toàn bộ task. Chi tiết từng task ở file tương ứng; riêng `WS-xx` mô tả đầy đủ ngay tại đây.

Cập nhật trạng thái ở **cả** file này và file task list khi đổi.

---

## `WS-xx` — Workspace & package dùng chung

### `WS-00` — Khung workspace + tài liệu · **DONE** (M0)

`package.json` root, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc` (22), `.gitignore`, toàn bộ `ai-docs/` và `ai-tasks/`, `CLAUDE.md`, `README.md`.

### `WS-01` — `packages/contracts` · **DONE** (2026-08-02) — build sạch, 45/45 test pass

`@kimthanh-tableqr/contracts`. TypeScript thuần, **zero dependency runtime**.

```
src/
├── enums.ts       # TableStatus, SessionStatus, OrderStatus, StaffCallType, StaffCallStatus
├── entities.ts    # Restaurant, DiningTable, MenuCategory, MenuItem,
│                  # TableSession, Order, OrderItem, StaffCall
├── dto.ts         # request/response cho từng endpoint ở ai-docs/04
├── errors.ts      # ApiErrorCode + shape { error: { code, message, details } }
├── totals.ts      # calcLineTotal, calcCartTotal, calcOrderTotal, calcSessionTotal
├── format.ts      # formatVnd, formatTime, formatRelativeTime, removeVietnameseTones
├── transitions.ts # canTransitionOrderStatus()
└── index.ts
```

`calcSessionTotal` **phải loại đơn `CANCELLED`**. `formatVnd(45000)` → `"45.000 ₫"`.

Test bắt buộc: `formatVnd` (gồm 0 và số lớn), `removeVietnameseTones`, `calcCartTotal` với `quantity > 1`, `calcSessionTotal` có đơn bị huỷ, bảng chuyển trạng thái.

### `WS-02` — Fixture dữ liệu mẫu · **DONE** (2026-08-02)

`packages/mock/src/fixtures.ts` + `packages/mock/assets/`.

- 1 `Restaurant`
- **≥ 4 danh mục**: Đồ uống · Khai vị · Món chính · Tráng miệng
- **≥ 20 món** (mục tiêu 24) tiếng Việt thật (cà phê sữa đá, bún bò Huế, gỏi cuốn, cơm tấm sườn, chè ba màu...), giá thực tế, mô tả ngắn
- **≥ 8 bàn**, `qrToken` cố định (hard-code, không random — để dev bookmark URL được)
- Sẵn 1 phiên đang mở có 2 đơn, để màn hình bếp và màn `/orders` có dữ liệu ngay từ lần chạy đầu

Ghi rõ `qrToken` của bàn 1 ở đầu file để dev copy nhanh.

**Ảnh thật là phần bắt buộc của task này, không phải việc dọn sau.** Menu render bằng ô xám thì không đánh giá được UI — ảnh chiếm ~70% diện tích nhìn thấy của app khách, và bố cục hợp lý với ô xám có thể vỡ hoàn toàn khi thả ảnh thật vào.

- Tải **đủ 1 ảnh cho mỗi món** về `packages/mock/assets/`, **không hotlink CDN** (app phải chạy khi mất mạng; ảnh phải cố định để so sánh giữa các lần chỉnh giao diện)
- Đặt tên theo slug món: `ca-phe-sua-da.jpg`, `bun-bo-hue.jpg`
- 800×800, JPEG q80, **≤ 90 KB/ảnh**
- **Ảnh phải đúng món.** Ảnh sai món tệ hơn không có ảnh. Món nào không tìm được ảnh đúng thì **đổi món trong fixture**, đừng dùng ảnh gần đúng.
- `packages/mock/assets/CREDITS.md` ghi nguồn + giấy phép từng ảnh
- Dữ liệu phải có đủ ca biên để ép bố cục lộ lỗi: **1 tên món dài tràn 2 dòng**, **1 mô tả rất dài**, **2 món `isAvailable=false`**, **1 giá 6 chữ số** (kiểm cột giá thẳng hàng)

Nguồn: Unsplash / Pexels (giấy phép thoáng). Quy cách đầy đủ: `ai-docs/08 §5`.

**Kết quả thực tế:** 21 ảnh (không phải 24) trong `packages/mock/assets/`, kèm `CREDITS.md`. Nguồn cuối cùng là **Wikimedia Commons + Openverse/Flickr**, không phải Unsplash — Unsplash cần API key. Đã kiểm **từng ảnh bằng mắt**; Commons trả 4 ảnh sai hẳn món (nước mía → bánh kem, chè đậu xanh → nồi đậu sống) nên phải đổi nguồn và chọn tay.

Ba món **bỏ khỏi thực đơn** vì không tìm được ảnh đúng, theo đúng quy tắc "ảnh sai món tệ hơn không có ảnh": trà tắc, sữa chua nếp cẩm, chè đậu xanh. Thực đơn còn 21 món + 1 món cố ý **không có ảnh** (trà tắc giữ lại trong fixture để kiểm ô placeholder chữ cái đầu). Chi tiết: `ai-tasks/04-open-questions.md` Q9.

### `WS-03` — Mock store + MSW handlers · TODO (M1)

`packages/mock`. Store in-memory, persist `localStorage`, có `resetStore()`.

Handlers **khớp 1:1** với `ai-docs/04-api-contract.md` — đối chiếu bảng 29 dòng ở cuối file đó. Store phải thực thi đúng các bất biến ở `ai-docs/03 §Quy tắc bất biến`, gồm: một session `OPEN` mỗi bàn, `sequenceNo` liên tục, snapshot giá, chặn món hết hàng, `close` không xoá đơn.

`src/browser.ts` xuất `startMockWorker()`; `src/node.ts` xuất server cho vitest.

**Mock phải NGHIÊM NGẶT hơn mức cần thiết, không dễ dãi.** Đây là điều kiện sống còn của cách làm UI-trước-BE-sau: mock dễ dãi cho UI đi qua những đường mà API thật sẽ chặn, và tới M7 mới vỡ. Bắt buộc:

- **Thực thi đủ 7 bất biến** ở `ai-docs/03 §Quy tắc bất biến`, kể cả những cái UI "chắc không bao giờ vi phạm". Vi phạm → **ném lỗi đúng `code` HTTP**, không âm thầm cho qua.
- **Validate payload vào** đúng như server sẽ làm: thiếu trường, sai kiểu, `quantity` ≤ 0, `menuItemId` không tồn tại → `VALIDATION_ERROR`. Không tin client.
- **Bỏ qua giá client gửi lên.** Nếu request có trường giá, mock phải **lờ đi** và tự snapshot từ `MenuItem` — giống hệt server. Để không ai lỡ viết UI phụ thuộc vào việc gửi giá.
- **Idempotency `X-Request-Id`** phải chạy thật (`Map` + cửa sổ 60s), không phải no-op.
- **Kiểm tra token** ở `/staff/*` và `/admin/*`: thiếu → `401`, sai role → `403`. Để route guard được thử thật.

**Chaos toggle** (bảng dev, lưu `localStorage`) — để bốn trạng thái UI được luyện thật chứ không chỉ tồn tại trên giấy:

| Toggle | Mặc định | Dùng để |
| --- | --- | --- |
| Độ trễ | ngẫu nhiên **150–800ms** | Loading state hiện ra thật, lộ chỗ nào quên skeleton |
| Tỉ lệ lỗi 500 | 0%, chỉnh lên 10–30% | Ép đi qua error state + nút thử lại |
| Chế độ offline | tắt | Thử màn mất mạng |
| Ép `SESSION_CLOSED` | tắt | Thử case nhân viên reset bàn giữa chừng |
| Ép `ITEMS_UNAVAILABLE` | tắt | Thử case món hết khi đang gửi đơn |

Độ trễ **cố định 200ms là sai** — nó làm UI trông mượt giả tạo. Độ trễ thay đổi mới lộ ra chỗ thiếu trạng thái chờ và chỗ bị double-submit.

### `WS-04` — `packages/ui` · TODO (M1)

`theme.css` với token Tailwind v4 `@theme` (bảng token ở `ai-docs/05`), cộng primitive: `Button` · `IconButton` · `Badge` · `OrderStatusBadge` · `BottomSheet` (bẫy focus, `Esc`) · `Modal` · `QuantityStepper` · `Money` · `EmptyState` · `ErrorState` · `LoadingSkeleton` · `Toast`.

Named export, không `export default`. Chỉ đưa vào đây thứ **≥ 2 app** dùng.

### `WS-08` — Prototype trực quan · **DONE** (2026-08-02)

**Chốt thẩm mỹ ở chỗ rẻ trước khi sang chỗ đắt.** Một file `prototype/guest-menu.html` tĩnh, mở bằng trình duyệt là chạy — không framework, không build tool. Ảnh thật từ `packages/mock/assets/`.

Sửa một dòng CSS rồi F5 mất 2 giây; cũng thay đổi đó trong React sau khi đã có router + Query + MSW thì mất 2 phút và kéo theo rủi ro. Đây cũng là cách bạn đã làm ở `kimthanh-tutor`.

Phải dựng thật cả 4 trạng thái (loading / rỗng / lỗi / có dữ liệu) với hàng nút dev để chuyển qua lại, và các tương tác chính: thêm vào giỏ, bottom sheet chi tiết món, chip danh mục, tìm kiếm bỏ dấu.

Prompt sẵn để dán: [11-ui-build-prompts.md §6](11-ui-build-prompts.md). Token: `ai-docs/08`.

**Đã làm rộng hơn dự kiến:** không chỉ màn menu mà **cả 13 màn của 3 app**, sau khi người dùng xem bản đầu và duyệt hướng thiết kế. Xem [`prototype/README.md`](../prototype/README.md).

Đã kiểm bằng máy: 13 màn không lỗi JS; 13 màn × 3 khổ 375/768/1440 không màn nào tràn ngang.

Cách port sang React: [12-prototype-to-react.md](12-prototype-to-react.md). Prototype là artifact dùng một lần — sau khi màn React tương ứng xong thì nó chỉ còn giá trị tham chiếu, không cần giữ đồng bộ.

### `WS-05` — Rà soát responsive & a11y · TODO (M5)
Đi hết checklist mục C của `ai-docs/07` trên cả 3 app.

### `WS-06` — Bổ sung test logic · TODO (M5)
Hoàn thiện checklist test ở mục D của `ai-docs/07`. Test logic thuần, không test UI.

### `WS-07` — Ngân sách hiệu năng app khách · TODO (M5)
Đo theo mục B của `ai-docs/07`. Bundle initial `tableqr-guest` **< 150 KB gzip**. Vượt thì cắt, không nới ngưỡng.

---

## Bảng tổng

| Mã | Task | Mốc | Trạng thái |
| --- | --- | --- | --- |
| `WS-00` | Khung workspace + tài liệu | M0 | **DONE** |
| `WS-01` | `packages/contracts` | M1 | **DONE** — 45/45 test |
| `WS-02` | Fixture + **21 ảnh món thật** | M1 | **DONE** |
| `WS-03` | Mock store + MSW handlers | M1 | TODO |
| `WS-04` | `packages/ui` (theo `ai-docs/08`) | M1 | TODO |
| `WS-08` | **Prototype 13 màn** — chốt look | M1 | **DONE** |
| `GU-00` | Khởi tạo app khách | M2 | TODO |
| `GU-01` | Router + shell + tải phiên bàn | M2 | TODO |
| `GU-02` | Màn menu | M2 | TODO |
| `GU-03` | Tìm kiếm món (bỏ dấu) | M2 | TODO |
| `GU-04` | Bottom sheet chi tiết món | M2 | TODO |
| `GU-05` | Trạng thái giỏ hàng | M2 | TODO |
| `GU-06` | Màn giỏ hàng + Gửi đơn | M2 | TODO |
| `GU-07` | Màn xác nhận đã gửi | M2 | TODO |
| `GU-08` | Màn đơn của bàn (gọi thêm món) | M2 | TODO |
| `GU-09` | Nút nổi Gọi nhân viên | M2 | TODO |
| `GU-10` | Trạng thái lỗi & màn biên | M2 | TODO |
| `ST-00` | Khởi tạo app bếp | M3 | TODO |
| `ST-01` | Đăng nhập PIN | M3 | TODO |
| `ST-02` | Hook realtime (polling) | M3 | TODO |
| `ST-03` | Bảng đơn | M3 | TODO |
| `ST-04` | Chuyển trạng thái đơn | M3 | TODO |
| `ST-05` | Chuông báo đơn mới | M3 | TODO |
| `ST-06` | Sơ đồ bàn | M3 | TODO |
| `ST-07` | Chi tiết phiên + Reset bàn | M3 | TODO |
| `ST-08` | Thông báo gọi nhân viên | M3 | TODO |
| `ST-09` | (tuỳ chọn) Proxy cùng origin | M3 | TODO |
| `AD-00` | Khởi tạo app admin + shell | M4 | TODO |
| `AD-01` | Đăng nhập | M4 | TODO |
| `AD-02` | Danh sách danh mục | M4 | TODO |
| `AD-03` | Danh sách món + toggle Còn hàng | M4 | TODO |
| `AD-04` | Form món | M4 | TODO |
| `AD-05` | Quản lý bàn | M4 | TODO |
| `AD-06` | Xem mã QR một bàn | M4 | TODO |
| `AD-07` | Trang in mã QR hàng loạt | M4 | TODO |
| `AD-08` | Cài đặt quán | M4 | TODO |
| `WS-05` | Rà soát responsive & a11y | M5 | TODO |
| `WS-06` | Bổ sung test logic | M5 | TODO |
| `WS-07` | Ngân sách hiệu năng | M5 | TODO |
| `BE-00`…`BE-13` | Backend + nối FE↔BE | M6–M7 | 🔒 **BLOCKED** |

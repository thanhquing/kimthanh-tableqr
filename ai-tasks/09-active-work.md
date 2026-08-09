# 09 — Việc đang làm

**Đọc file này đầu tiên mỗi phiên làm việc.** Nhận đúng `Current task`, không tự chọn task `TODO` khác.

---

## Current task

> ### `BE-09` — Upload ảnh món
>
> **Mốc:** M6 · **Trạng thái:** BLOCKED
>
> Chi tiết đầy đủ: [08-api-task-list.md § BE-09](08-api-task-list.md)
>
> **Đọc trước khi làm:** [`ai-tasks/08-api-task-list.md`](08-api-task-list.md), [`ai-docs/04-api-contract.md`](../ai-docs/04-api-contract.md), [`ai-docs/03-domain-model.md`](../ai-docs/03-domain-model.md).
>
> **Chờ quyết định:** nơi lưu ảnh (đĩa cục bộ hay S3-compatible) trước khi triển khai upload/resize.

---

## Đã xong

| Task | Ngày | Ghi chú |
| --- | --- | --- |
| `BE-08` — Logic tính tiền dùng chung | 2026-08-09 | Guest và staff dùng helper import từ `packages/contracts`; Docker build/runtime và endpoint tổng tiền đã kiểm tra. |
| `BE-05` — Staff module | 2026-08-09 | JWT/role guard; Docker test order/table, transition 200/409, pay/close/call 200. |
| `BE-04` — Guest module | 2026-08-09 | 4 endpoint Docker-tested; session race-safe, snapshot giá, idempotency DB 60 giây, call PENDING không trùng và rate limit QR/bàn. |
| `BE-03` — Auth | 2026-08-09 | Staff PIN/owner password bcrypt, JWT + role guards, rate limit 5 lần/phút; Docker test login đúng 200, sai 401. |
| `BE-02` — Seed | 2026-08-09 | Seed idempotent dùng trực tiếp fixture mock; PostgreSQL xác nhận 1 quán, 4 danh mục, 22 món, 8 bàn, session mẫu 2 đơn/4 item sau hai lần chạy. |
| `BE-01` — Prisma schema + migration | 2026-08-09 | Schema snake_case + migration PostgreSQL 15 đã chạy thật trong Docker; partial unique session OPEN, unique/index/check constraints đã xác nhận bằng SQL. |
| `BE-00` — Khởi tạo NestJS + Prisma + Postgres | 2026-08-09 | NestJS 10 `/api/v1`, Prisma/PostgreSQL Compose, `.env.example`, `healthz`/`readyz`; generate/validate/lint/typecheck/build sạch. Khi DB chưa sẵn sàng: healthz 200, readyz 503; khi Compose chạy: cả hai endpoint 200. |
| Cổng M5 → M6 | 2026-08-02 | Lint/test/build workspace pass; guest 74,429 B gzip/no MSW dist; camera/Print Preview/visual checks deferred theo user |
| `WS-07` — Ngân sách hiệu năng guest | 2026-08-02 | VITE_USE_MOCK=false entry 74,429 B gzip (<150 KB); Vite loại public worker, dist không chứa MSW; lint/typecheck/build sạch |
| `WS-06` — Bổ sung test logic | 2026-08-02 | 45 contracts + 16 mock tests phủ D: money/cart/session/transition/28 handlers; workspace test sạch |
| `WS-05` — Rà soát responsive & a11y | 2026-08-02 | Workspace lint/test/build pass, static audit any/ignore/log/money/fetch sạch; visual/device checks deferred |
| `AD-08` — Cài đặt quán | 2026-08-02 | GET/PATCH restaurant, validate name, logo URL/address + preview khách; lint/typecheck/build sạch, JS initial 81,21 KB gzip |
| `AD-07` — Trang in mã QR hàng loạt | 2026-08-02 | Route no-sidebar, active table selection, QR canvas A4 3×4 và print CSS; lint/typecheck/build sạch, JS initial 80,69 KB gzip; Print Preview deferred |
| `AD-06` — Xem mã QR một bàn | 2026-08-02 | QRCodeCanvas từ qrUrl API, modal tên/URL, tải PNG; lint/typecheck/build sạch, JS initial 80,09 KB gzip; camera check deferred |
| `AD-05` — Quản lý bàn | 2026-08-02 | Table CRUD/status, 409 delete message, form update không có qrToken; lint/typecheck/build sạch, JS initial 73,69 KB gzip |
| `AD-04` — Form món | 2026-08-02 | Create/edit routes, fields đầy đủ, client validation/price preview, POST/PATCH và dirty unload warning; lint/typecheck/build sạch, JS initial 72,74 KB gzip |
| `AD-03` — Danh sách món | 2026-08-02 | Cột món theo danh mục, thumbnail/name/price, availability optimistic rollback, xóa + links form; lint/typecheck/build sạch, JS initial 71,67 KB gzip |
| `AD-02` — Danh sách danh mục | 2026-08-02 | GET categories/items, số món, CRUD/toggle, 409 message, drag/drop PATCH sort order; lint/typecheck/build sạch, JS initial 71,06 KB gzip |
| `AD-01` — Đăng nhập | 2026-08-02 | POST email/password, lỗi API, auth owner localStorage/guard/logout sidebar; lint/typecheck/build sạch, JS initial 64,77 KB gzip |
| `AD-00` — Khởi tạo app + shell | 2026-08-02 | Vite/React/TS cổng 5175, mock worker, Query/Router, sidebar responsive + placeholder routes, `.env.example` guest URL; lint/typecheck/build sạch, JS initial 63,90 KB gzip |
| `ST-08` — Thông báo gọi nhân viên | 2026-08-02 | Header bell poll 3 giây, badge/modal, ưu tiên request bill, optimistic PATCH DONE rollback; lint/typecheck/build sạch, JS initial 72,41 KB gzip |
| `ST-07` — Chi tiết phiên + thanh toán + reset bàn | 2026-08-02 | GET session detail, tổng `calcSessionTotal`, POST pay/close, cảnh báo reset chưa thanh toán; lint/typecheck/build sạch, JS initial 71,79 KB gzip |
| `ST-06` — Sơ đồ bàn | 2026-08-02 | Query tables, lưới busy/empty/call, link chi tiết phiên; lint/typecheck/build sạch, JS initial 70,69 KB gzip |
| `ST-05` — Chuông báo đơn mới | 2026-08-02 | Web Audio khi có order mới, mute localStorage/gợi ý autoplay; lint/typecheck/build sạch, JS initial 69,55 KB gzip |
| `ST-04` — Chuyển trạng thái đơn | 2026-08-02 | PATCH optimistic/rollback trong order stream; transition hợp lệ + modal hủy; lint/typecheck/build sạch, JS initial 68,94 KB gzip |
| `ST-03` — Bảng đơn | 2026-08-02 | Board ba cột tablet/mobile, thẻ đơn có late/fresh/note, state loading/empty; lint/typecheck/build sạch, JS initial 67,72 KB gzip |
| `ST-02` — Hook realtime | 2026-08-02 | Poll 3 giây, serverTime cursor, merge updates; debug mock handler; staff build sạch, mock 16/16 test pass |
| `ST-01` — Đăng nhập PIN | 2026-08-02 | PIN keypad 64px, POST login, auth localStorage/guard/logout; lint/typecheck/build sạch, JS initial 62,77 KB gzip |
| `ST-00` — Khởi tạo app bếp | 2026-08-02 | Vite/React/TS, mock worker, Query/Router, shell tablet-first cổng 5174; lint/typecheck/build sạch, JS initial 61,99 KB gzip |
| `GU-10` — Trạng thái lỗi & màn hình biên | 2026-08-02 | Offline banner, SessionClosedPage, error boundary/state audit; lint/typecheck/build sạch, JS initial 74,41 KB gzip |
| `GU-09` — Nút nổi Gọi nhân viên | 2026-08-02 | Menu call/bill POST thật, cooldown 30 giây, vị trí tránh thanh giỏ; lint/typecheck/build sạch, JS initial 74,17 KB gzip |
| `GU-08` — Màn đơn của bàn | 2026-08-02 | Poll orders 10 giây, state badge/item/note/tổng phiên, đủ loading/error/empty; lint/typecheck/build sạch, JS initial 73,63 KB gzip |
| `GU-07` — Màn xác nhận đã gửi | 2026-08-02 | Snapshot đơn vừa gửi, recap/note/tổng, redirect 3 giây và nút bỏ qua; lint/typecheck/build sạch, JS initial 73,40 KB gzip |
| `GU-06` — Màn giỏ hàng + Gửi đơn | 2026-08-02 | Cart tăng/giảm/xóa + Hoàn tác; ghi chú inline/chip; POST thật kèm request ID, chặn double-submit; ITEMS_UNAVAILABLE/SESSION_CLOSED; lint/typecheck/build sạch, JS initial 72,99 KB gzip |
| `GU-05` — Trạng thái giỏ hàng | 2026-08-02 | Cart context/reducer `sessionStorage` theo session; gộp món+note qua contracts; thanh giỏ nổi; lint/typecheck/build sạch, JS initial 72,70 KB gzip |
| `GU-04` — Bottom sheet chi tiết món | 2026-08-02 | Sheet phủ menu: ảnh 16:9, stepper/note/chip/CTA; scrim/Esc/vuốt, focus trap/trả focus; UI + guest lint/typecheck/build sạch, JS initial 72,14 KB gzip |
| `GU-03` — Tìm kiếm món (bỏ dấu) | 2026-08-02 | Tìm tại chỗ theo tên bằng `removeVietnameseTones`; clear giữ focus; không kết quả có nút xoá; lint/typecheck/build sạch, JS initial 70,82 KB gzip |
| `GU-02` — Màn menu | 2026-08-02 | Menu nhóm/sắp xếp theo danh mục; tab sticky cuộn ngang và active theo IntersectionObserver; item 88px lazy + placeholder; món hết hàng mờ/khóa; nút `+` hiện số lượng đã chọn; lint/typecheck/build sạch, JS initial 70,30 KB gzip |
| `GU-01` — Router + shell + tải phiên bàn | 2026-08-02 | Đủ route guest; shell hiện tên quán + bàn; `apiClient` tự gắn `X-Guest-Token`; `useTableSession(qrToken)` qua TanStack Query; `TABLE_NOT_FOUND` → `/t/invalid`; `/cart` và `/orders` lazy chunk; lint/build sạch, JS initial 69,16 KB gzip |
| `GU-00` — Khởi tạo app khách | 2026-08-02 | Vite 5 + React 18 + TS; UI theme/Tailwind v4; Router + Query provider; error boundary; MSW dynamic import/await trước render; lint/build sạch, workspace **61/61 test pass**, JS initial 57,18 KB gzip |
| `WS-00` — Khung workspace + tài liệu | 2026-08-01 | M0 đạt. `ai-docs/` 00–08, `ai-tasks/` 00–12, `CLAUDE.md`, `README.md` |
| `WS-01` — `packages/contracts` | 2026-08-02 | Build sạch, **45/45 test pass**. `formatVnd` · `calcSessionTotal` (loại `CANCELLED`) · `addToCart` (gộp theo `menuItemId`+`note`) · `removeVietnameseTones` · bảng chuyển trạng thái |
| `WS-02` — Fixture + ảnh món | 2026-08-02 | **21 ảnh thật đã kiểm bằng mắt**, ≤90KB, `CREDITS.md`. Bỏ 3 món không có ảnh đúng. Xem Q9 ở [04-open-questions.md](04-open-questions.md) |
| `WS-03` — Mock store + MSW handlers | 2026-08-02 | **28 handler M1** đối chiếu method/path (SSE để M7), đủ 7 bất biến, auth/validation/idempotency/persistence/chaos; **16/16 test pass** |
| `WS-04` — `packages/ui` | 2026-08-02 | `theme.css` Tailwind v4 `@theme`; đủ primitive dùng chung; focus trap cho `Modal`/`BottomSheet`; workspace typecheck/build/test sạch |
| Cổng M1→M2 | 2026-08-02 | **Đạt**: 3 package build sạch; 28 handler M1 đã đối chiếu; prototype đã duyệt |
| `WS-08` — Prototype giao diện | 2026-08-02 | **13 màn HTML**, người dùng đã duyệt hướng thiết kế. Không lỗi JS, không tràn ngang ở 375/768/1440. Xem [`prototype/`](../prototype/README.md) |

---

## Tiếp theo (theo thứ tự, không đảo)

`BE-09`…`BE-13` (BE-09 đang chờ quyết định nơi lưu ảnh).

Cổng M1→M2 đã đạt ngày 2026-08-02: đối chiếu xong 28 handler M1 ở bảng cuối `ai-docs/04`, dòng 29 là SSE để M7; prototype đã duyệt; 3 package M1 build sạch.

---

## Nhắc

- **Task UI thì KHÔNG thiết kế lại.** Giao diện đã dựng và duyệt ở [`prototype/`](../prototype/README.md). Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước khi động vào `GU-*` / `ST-*` / `AD-*`.
- Camera QR, Print Preview và visual responsive vẫn cần test thủ công trước phát hành.
- Làm tuần tự guest → staff → admin, **không song song**: app khách định hình `packages/ui`, hai app sau kế thừa.
- Token màu/chữ lấy từ [`ai-docs/08-design-system.md`](../ai-docs/08-design-system.md) — hex đã đo tương phản, đổi là phải đo lại.

---

## Việc chưa xong, cần người quyết

| | |
| --- | --- |
| **Chất lượng ảnh món** | 18/21 ảnh tốt, 3 ảnh tạm được (`ca-phe-sua-da` nền bừa, `che-ba-mau` nhợt, `tra-da` hơi xanh). Ba đường xử lý ở [04-open-questions.md](04-open-questions.md) **Q9** — chưa chốt. Không chặn việc gì; đổi ảnh sau chỉ cần thay file cùng tên. |
| **Duyệt look 10 màn còn lại** | Người dùng đã duyệt hướng thiết kế qua màn menu. 4 màn admin và 3 màn staff mới chỉ chắc là *chạy được và không vỡ bố cục*, chưa được xem kỹ bằng mắt. Nên xem trước khi bắt đầu `AD-*` / `ST-*`. |

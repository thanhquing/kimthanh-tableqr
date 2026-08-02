# 09 — Việc đang làm

**Đọc file này đầu tiên mỗi phiên làm việc.** Nhận đúng `Current task`, không tự chọn task `TODO` khác.

---

## Current task

> ### `GU-10` — Trạng thái lỗi & màn hình biên
>
> **Mốc:** M2 · **Trạng thái:** TODO
>
> Chi tiết đầy đủ: [05-guest-task-list.md § GU-10](05-guest-task-list.md)
>
> **Đọc trước khi làm:** [`ai-tasks/12-prototype-to-react.md`](12-prototype-to-react.md), [`prototype/guest-menu.html`](../prototype/guest-menu.html), [`ai-docs/05-ui-ux-spec.md`](../ai-docs/05-ui-ux-spec.md), [`ai-docs/04-api-contract.md`](../ai-docs/04-api-contract.md), [`packages/contracts/src/totals.ts`](../packages/contracts/src/totals.ts).
>
> **Xong khi:** rà trạng thái lỗi/offline/skeleton toàn guest app và chuỗi tiếng Việt.

---

## Đã xong

| Task | Ngày | Ghi chú |
| --- | --- | --- |
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

`GU-10` → `ST-00`…`ST-08` → `AD-00`…`AD-08` → `WS-05`…`WS-07` → **cổng M5→M6** → `BE-*`.

Cổng M1→M2 đã đạt ngày 2026-08-02: đối chiếu xong 28 handler M1 ở bảng cuối `ai-docs/04`, dòng 29 là SSE để M7; prototype đã duyệt; 3 package M1 build sạch.

---

## Nhắc

- **Task UI thì KHÔNG thiết kế lại.** Giao diện đã dựng và duyệt ở [`prototype/`](../prototype/README.md). Đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước khi động vào `GU-*` / `ST-*` / `AD-*`.
- `BE-*` đang 🔒 **BLOCKED** cho tới khi M5 đạt. Xem [08-api-task-list.md](08-api-task-list.md).
- Làm tuần tự guest → staff → admin, **không song song**: app khách định hình `packages/ui`, hai app sau kế thừa.
- Token màu/chữ lấy từ [`ai-docs/08-design-system.md`](../ai-docs/08-design-system.md) — hex đã đo tương phản, đổi là phải đo lại.

---

## Việc chưa xong, cần người quyết

| | |
| --- | --- |
| **Chất lượng ảnh món** | 18/21 ảnh tốt, 3 ảnh tạm được (`ca-phe-sua-da` nền bừa, `che-ba-mau` nhợt, `tra-da` hơi xanh). Ba đường xử lý ở [04-open-questions.md](04-open-questions.md) **Q9** — chưa chốt. Không chặn việc gì; đổi ảnh sau chỉ cần thay file cùng tên. |
| **Duyệt look 10 màn còn lại** | Người dùng đã duyệt hướng thiết kế qua màn menu. 4 màn admin và 3 màn staff mới chỉ chắc là *chạy được và không vỡ bố cục*, chưa được xem kỹ bằng mắt. Nên xem trước khi bắt đầu `AD-*` / `ST-*`. |

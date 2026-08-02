# 09 — Việc đang làm

**Đọc file này đầu tiên mỗi phiên làm việc.** Nhận đúng `Current task`, không tự chọn task `TODO` khác.

---

## Current task

> ### `GU-01` — Router + shell + tải phiên bàn
>
> **Mốc:** M2 · **Trạng thái:** TODO
>
> Chi tiết đầy đủ: [05-guest-task-list.md § GU-01](05-guest-task-list.md)
>
> **Đọc trước khi làm:** [`ai-tasks/12-prototype-to-react.md`](12-prototype-to-react.md), [`prototype/guest-menu.html`](../prototype/guest-menu.html), [`ai-docs/04-api-contract.md`](../ai-docs/04-api-contract.md), [`ai-docs/06-architecture-and-tech-stack.md`](../ai-docs/06-architecture-and-tech-stack.md).
>
> **Xong khi:** đủ route guest, shell hiển thị đúng tên quán + bàn, `useTableSession(qrToken)` tải qua TanStack Query và `apiClient` tự gắn `X-Guest-Token`; `TABLE_NOT_FOUND` chuyển sang `/t/invalid`; `/cart` và `/orders` được lazy-load.

---

## Đã xong

| Task | Ngày | Ghi chú |
| --- | --- | --- |
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

`GU-01`…`GU-10` → `ST-00`…`ST-08` → `AD-00`…`AD-08` → `WS-05`…`WS-07` → **cổng M5→M6** → `BE-*`.

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

# CLAUDE.md — Kim Thanh TableQR

Hướng dẫn cho AI/dev khi làm việc trong monorepo này. File này là **điểm vào duy nhất**: nó không lặp lại nội dung `ai-docs`/`ai-tasks` mà chỉ trỏ tới đúng nguồn.

Khi có mâu thuẫn, thứ tự ưu tiên: **code đang chạy → `ai-docs` → `ai-tasks` → file này.** Code khác doc thì sửa cho khớp rồi cập nhật doc.

Ngôn ngữ: tài liệu, comment, chuỗi hiển thị **tiếng Việt**; định danh code **tiếng Anh** (TS `camelCase`, DB `snake_case`).

---

## 1. Sản phẩm này là gì

Hệ thống gọi món bằng mã QR tại bàn cho quán ăn nhỏ Việt Nam. Khách vào quán, tự tìm bàn, quét mã QR dán trên bàn → trình duyệt mở menu → chọn món, ghi chú ("ít đá", "không rau") → bấm Gửi đơn → đơn hiện ngay trên màn hình bếp kèm số bàn. Ăn xong, nhân viên bấm "Reset bàn".

**Điểm khác biệt cốt lõi — không được đánh đổi vì bất cứ lý do gì:**

- **Không cài app.** Trình duyệt di động thường.
- **Không đăng nhập, không đăng ký, không nhập số điện thoại.** Không có màn chắn nào giữa "quét" và "thấy món".
- **Chạy được cho quán lề đường.** Một cái điện thoại ở quầy là đủ. Không đòi phần cứng đắt tiền.
- **Mỗi bàn một mã QR riêng** ⇒ hệ thống luôn biết đơn nào của bàn nào.

Mục tiêu trải nghiệm: **quét → gửi đơn xong trong 25–30 giây.**

---

## 2. Bắt đầu một phiên làm việc

1. [`ai-tasks/09-active-work.md`](ai-tasks/09-active-work.md) → nhận đúng `Current task`. **Không tự chọn task khác.**
2. [`ai-tasks/03-ai-working-rules.md`](ai-tasks/03-ai-working-rules.md) → quy tắc + Definition of Done.
3. [`ai-tasks/04-open-questions.md`](ai-tasks/04-open-questions.md) → giả định nào chưa chốt.
4. Các file `ai-docs` mà task chỉ định.

---

## 3. Bản đồ tài liệu

| Cần biết | Đọc |
| --- | --- |
| Luồng khách & luồng quán, các case biên | [`ai-docs/01-business-flow.md`](ai-docs/01-business-flow.md) |
| Có gì / không có gì trong MVP | [`ai-docs/02-product-scope.md`](ai-docs/02-product-scope.md) |
| Entity, enum, quy tắc bất biến | [`ai-docs/03-domain-model.md`](ai-docs/03-domain-model.md) |
| **Hợp đồng API** (mock và BE đều phải khớp) | [`ai-docs/04-api-contract.md`](ai-docs/04-api-contract.md) |
| Màn hình, state, copy tiếng Việt | [`ai-docs/05-ui-ux-spec.md`](ai-docs/05-ui-ux-spec.md) |
| **Token màu/chữ/ảnh có giá trị thật** + danh sách cấm | [`ai-docs/08-design-system.md`](ai-docs/08-design-system.md) |
| **Giao diện đã duyệt — 13 màn HTML** | [`prototype/`](prototype/README.md) |
| **Chuyển prototype → React** (đọc trước mọi task UI) | [`ai-tasks/12-prototype-to-react.md`](ai-tasks/12-prototype-to-react.md) |
| Cách viết prompt dựng UI + rubric tự chấm | [`ai-tasks/11-ui-build-prompts.md`](ai-tasks/11-ui-build-prompts.md) |
| Kiến trúc, stack, quy ước code | [`ai-docs/06-architecture-and-tech-stack.md`](ai-docs/06-architecture-and-tech-stack.md) |
| **Sơ đồ hệ thống đang chạy: FE/BE/infra/ERD** | [`ai-docs/09-current-system-architecture.md`](ai-docs/09-current-system-architecture.md) |
| **Roadmap SaaS: đa quán, trial và billing** | [`ai-docs/10-saas-evolution.md`](ai-docs/10-saas-evolution.md) |
| **Runbook vận hành billing + ops CLI + giám sát** | [`ai-docs/11-billing-operations.md`](ai-docs/11-billing-operations.md) |
| Điều kiện nghiệm thu + ngân sách hiệu năng | [`ai-docs/07-acceptance-criteria.md`](ai-docs/07-acceptance-criteria.md) |
| Mốc, backlog, task | [`ai-tasks/`](ai-tasks/00-index.md) |

---

## 4. Cấu trúc monorepo

pnpm workspace. Node ≥ 20.19 (dùng 22, xem `.nvmrc`), `pnpm@10.13.1`.

| Thư mục | Vai trò | Stack | Trạng thái |
| --- | --- | --- | --- |
| `packages/contracts` | Type, DTO, enum, tính tổng tiền, `formatVnd()`. Zero dependency. | TS thuần | `WS-01` DONE |
| `packages/mock` | Fixture + store + MSW handlers khớp `ai-docs/04` | TS + MSW 2 | `WS-02`/`WS-03` DONE |
| `packages/ui` | `theme.css` (Tailwind v4 `@theme`) + primitive dùng chung | TS + React | `WS-04` DONE |
| `prototype` | **13 màn HTML tĩnh — giao diện đã duyệt.** Nguồn chân lý về look. | HTML/CSS/JS thuần | `WS-08` DONE |
| `tableqr-guest` | App khách, mobile-first, không đăng nhập | Vite + React SPA | M2 DONE; M7 API thật DONE |
| `tableqr-staff` | Màn hình bếp/quầy, tablet-first | Vite + React SPA | M3 DONE; M7 SSE/API thật DONE |
| `tableqr-admin` | Quản trị menu, bàn, in mã QR | Vite + React SPA | M4 DONE; M7 API thật DONE |
| `tableqr-api` | Backend | NestJS + Prisma + PostgreSQL | M6 DONE; `BE-13` device verification BLOCKED |
| `ai-docs` | Nguồn chân lý nghiệp vụ | — | Đầy đủ |
| `ai-tasks` | Nguồn chân lý triển khai | — | Đầy đủ |

---

## 5. Lệnh thường dùng

```bash
nvm use 22          # BAT BUOC — shell mac dinh o Node 16, pnpm khong chay duoc
pnpm install

pnpm dev:guest      # http://localhost:5173
pnpm dev:staff      # http://localhost:5174
pnpm dev:admin      # http://localhost:5175

pnpm build          # build moi package co script build
pnpm test
pnpm lint
```

Kịch bản kiểm tra đầy đủ cho từng mốc: [`ai-tasks/10-verification.md`](ai-tasks/10-verification.md).

---

## 6. Trình tự triển khai

> ### Giai đoạn lịch sử đã hoàn tất: dựng xong **toàn bộ UI của cả 3 app** rồi mới bắt đầu backend

Ràng buộc này đã được tuân thủ và M5/M6 đã hoàn tất. Không diễn giải nó như cấm sửa backend hiện tại; thứ tự công việc hiện tại lấy từ [`ai-tasks/09-active-work.md`](ai-tasks/09-active-work.md). Roadmap SaaS sau M7 ở [`ai-tasks/13-saas-expansion.md`](ai-tasks/13-saas-expansion.md).

M0 khung + docs → M1 packages → M2 guest → M3 staff → M4 admin → M5 polish/test/perf → M6 backend → M7 nối FE↔BE → M8–M11 SaaS → `BE-13` kiểm thử thiết bị thật trước phát hành. Thứ tự chi tiết luôn lấy từ `09-active-work.md`.

Làm **tuần tự guest → staff → admin**, không song song: app khách định hình `packages/ui`, hai app sau kế thừa.

Chi tiết: [`ai-tasks/01-milestones.md`](ai-tasks/01-milestones.md).

---

## 7. Quy tắc vàng

0. **Task UI thì KHÔNG thiết kế lại.** Giao diện đã dựng và người dùng đã duyệt ở [`prototype/`](prototype/README.md). Mở đúng màn, bấm thử, dựng lại bằng React theo [`ai-tasks/12-prototype-to-react.md`](ai-tasks/12-prototype-to-react.md). Muốn đổi bố cục/màu → hỏi trước, đừng tự đổi.
1. **Không thêm scope ngoài MVP.** Phạm vi ở `ai-docs/02`. Ý hay mà ngoài phạm vi → ghi backlog, không code.
2. **Không bắt khách nhập bất cứ thông tin cá nhân nào.** Xem §1.
3. **`ai-docs/04-api-contract.md` là hợp đồng.** Đổi shape ⇒ đổi contract ⇒ đổi mock ⇒ (M6+) đổi API, trong **cùng một lần thay đổi**.
4. **Tiền là số nguyên VND.** Hiển thị chỉ qua `formatVnd()`. Thấy `toLocaleString` trong component là sai.
5. **Snapshot giá bất khả xâm phạm.** Bill đọc `unitPriceVndSnapshot`, không bao giờ tính lại từ giá `MenuItem` hiện tại.
6. **"Reset bàn" không xoá dữ liệu** — nó đóng `TableSession`. Xem `ai-docs/01 §2`.
7. **Không `fetch` trong component.** Luôn qua `src/lib/api/*` + TanStack Query hook.
8. **Đẩy lên `packages/ui` chỉ khi ≥ 2 app dùng.** Trừu tượng hoá sớm là nợ.
9. **Mọi phép cộng tiền nằm trong `packages/contracts`** — FE và BE không được cộng ra hai con số khác nhau.

---

## 8. Bẫy đã biết

- **Node mặc định của máy là v16**, pnpm 10 cần ≥ 18.12. Quên `nvm use 22` là lỗi ngay dòng đầu.
- **Mock store không chia sẻ giữa 3 app** vì khác origin (khác port). Demo "khách gửi đơn → bếp thấy ngay" chỉ chạy thật từ M7. Trước đó dùng nút dev "Giả lập đơn mới" ở app bếp.
- **MSW phải `await` xong mới render**, nếu không request đầu tiên lọt ra ngoài và fail.
- **Ảnh món bắt buộc có `width`/`height` cố định** — CLS < 0.1 là ngưỡng nghiệm thu, không phải gợi ý.

---

## 9. Đồng bộ tài liệu (bắt buộc)

Khi triển khai làm đổi business rule hoặc shape dữ liệu:

1. Sửa file `ai-docs` tương ứng **trong cùng lần thay đổi đó**.
2. Cập nhật trạng thái ở `ai-tasks/02-backlog.md`, file task list, và `ai-tasks/09-active-work.md`.
3. Tự quyết điều gì chưa có trong doc → ghi vào `ai-tasks/04-open-questions.md` kèm giả định đang dùng.

Doc lệch code là lỗi tính vào task, không phải việc dọn sau.

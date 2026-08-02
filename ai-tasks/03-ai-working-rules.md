# 03 — Quy tắc làm việc

## Trước khi viết dòng code đầu tiên

1. Mở [09-active-work.md](09-active-work.md), lấy đúng `Current task`. **Không tự nhảy sang task khác** dù thấy nó dễ hơn hoặc "tiện tay".
2. Đọc các file `ai-docs` mà task chỉ định.
3. Liếc [04-open-questions.md](04-open-questions.md). Nếu task chạm vào một câu hỏi chưa chốt → dùng giả định đã ghi ở đó, **không tự quyết cái mới**.
4. Nếu phải tự quyết một điều chưa có trong doc → ghi ngay vào `04-open-questions.md` kèm giả định đang dùng.

## Quy tắc vàng

1. **Không thêm scope ngoài MVP.** Phạm vi ở `ai-docs/02-product-scope.md`. Ý tưởng hay mà ngoài phạm vi → ghi vào backlog, không code.
2. **Không bắt khách đăng nhập, đăng ký, hay nhập bất cứ thông tin cá nhân nào.** Đây là điểm khác biệt cốt lõi của sản phẩm. Mọi đề xuất đi ngược điều này bị bác không cần bàn.
3. **`ai-docs/04-api-contract.md` là hợp đồng.** Đổi shape dữ liệu ⇒ đổi contract ⇒ đổi mock ⇒ (M6+) đổi API, **trong cùng một lần thay đổi**. Không để lệch qua đêm.
4. **Không `fetch` trong component.** Luôn qua `src/lib/api/*` + TanStack Query hook.
5. **Tiền là số nguyên VND.** Hiển thị chỉ qua `formatVnd()` của `packages/contracts`. Thấy `toLocaleString` trong component là sai.
6. **Snapshot giá là bất khả xâm phạm.** Không bao giờ tính lại bill từ giá `MenuItem` hiện tại — luôn đọc `unitPriceVndSnapshot`.
7. **Reset bàn không xoá dữ liệu.** Xem `ai-docs/01-business-flow.md §2`.
8. **M6 khoá cho tới khi M5 xong.** Không viết code backend, không tạo `tableqr-api/`, không thêm Prisma schema trước thời điểm đó — kể cả khi thấy "làm luôn cho tiện".
9. **Tiếng Việt cho tài liệu / comment / chuỗi hiển thị; tiếng Anh cho định danh code.**
10. **Đẩy code lên `packages/ui` chỉ khi ≥ 2 app dùng.** Trừu tượng hoá sớm là nợ.

## Definition of Done

Một task chỉ được đánh `DONE` khi **tất cả** đúng:

- [ ] Chạy đúng như mô tả trong task
- [ ] Có đủ 4 trạng thái: loading / rỗng / lỗi có nút thử lại / có dữ liệu (nếu màn hình gọi dữ liệu)
- [ ] `pnpm --filter <app> lint` sạch, không warning
- [ ] `pnpm --filter <app> build` sạch
- [ ] Test đã viết cho phần logic thuần (tính tiền, gộp món, chuyển trạng thái) — không bắt test UI
- [ ] Đã tự đi tay kịch bản nghiệm thu tương ứng trong `ai-docs/07`
- [ ] Không còn `console.log`, `TODO`, code chết
- [ ] Cập nhật trạng thái trong task list + [02-backlog.md](02-backlog.md) + [09-active-work.md](09-active-work.md)

## Khi phát hiện doc sai

Code đang chạy > doc. Sửa doc cho khớp thực tế, ghi một dòng lý do ngay trong doc. **Đừng im lặng để code lệch doc** — người (hoặc AI) làm task sau sẽ tin doc và làm sai.

## Khi bị chặn

Ghi vào [04-open-questions.md](04-open-questions.md), đổi trạng thái task thành `BLOCKED` kèm một dòng lý do, rồi **làm mọi phần khác của task không phụ thuộc câu trả lời đó**. Không dừng cả task chỉ vì một chi tiết.

## Git

Chưa phải git repo tại M0. Khi khởi tạo: nhánh `main`, mỗi task một commit, message dạng `GU-03: gio hang + tinh tong tien`. Không commit `node_modules`, `dist`, `.env`, `public/mockServiceWorker.js`.

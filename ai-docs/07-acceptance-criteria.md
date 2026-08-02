# 07 — Điều kiện nghiệm thu

Đọc file này **trước khi** đánh dấu bất kỳ task nào là DONE.

## A. Nghiệm thu nghiệp vụ

### A1 — Khách gọi món lần đầu
1. Mở `/t/<qrToken>` trên điện thoại → thấy menu, không có màn đăng nhập nào.
2. Header hiện đúng **tên quán** và **số bàn** khớp với `qrToken`.
3. Chọn 2 món, một món ghi chú "ít đá", một món số lượng 3.
4. Thanh giỏ hàng hiện đúng số món và tổng tiền.
5. Bấm Gửi đơn → màn xác nhận → tự chuyển sang danh sách đơn.
6. Danh sách đơn hiện "Lần gọi #1" đúng món, đúng ghi chú, đúng tổng.

### A2 — Gọi thêm món (yêu cầu MVP)
1. Sau A1, bấm "Gọi thêm món" → về menu, giỏ rỗng.
2. Chọn thêm 1 món, gửi đơn.
3. Danh sách đơn có **hai** thẻ: "#1" và "#2".
4. **Tổng cộng cả phiên = tổng đơn 1 + tổng đơn 2.**
5. Màn hình bếp hiện đơn #2 là một thẻ riêng ghi rõ "Bàn X · lần gọi #2".

### A3 — Hai điện thoại cùng bàn
1. Quét cùng `qrToken` trên hai thiết bị.
2. Cả hai gọi món được; hai đơn nằm chung một phiên.
3. Tổng bill cộng cả hai; cả hai máy đều nhìn thấy đủ các lần gọi.

### A4 — Gọi nhân viên (yêu cầu MVP)
1. Khách bấm "Xin tính tiền".
2. Chuông trên header màn hình bếp tăng badge trong ≤ 3s (mock: sau 1 chu kỳ polling).
3. Thông báo ghi đúng số bàn và loại yêu cầu.
4. Bấm lại nút trong 30s không tạo thông báo thứ hai.
5. Nhân viên bấm "Đã xử lý" → thông báo biến mất.

### A5 — Vòng đời đơn ở bếp
1. Đơn mới xuất hiện có highlight + chuông (nếu chưa tắt tiếng).
2. Đơn sắp xếp **cũ nhất trước**.
3. `NEW` → "Bắt đầu làm" → sang cột Đang làm; app khách thấy badge đổi thành "Đang làm".
4. → "Đã phục vụ" → sang cột Đã phục vụ.
5. Huỷ đơn có hộp xác nhận; đơn bị huỷ **không** tính vào tổng bill.

### A6 — Reset bàn
1. Mở chi tiết phiên → tổng bill khớp con số khách thấy.
2. "Đã thanh toán" → ghi `paidAt`, mở khoá nút Reset.
3. "Reset bàn" → hộp xác nhận nói rõ đơn cũ vẫn được lưu.
4. Xác nhận → bàn về **EMPTY** trên sơ đồ.
5. Quét lại QR bàn đó → **phiên mới, giỏ sạch, không thấy đơn cũ**.
6. Thao tác của khách trên phiên cũ trả về `SESSION_CLOSED` và hiện màn "Phiên đã kết thúc".

### A7 — Chủ quán quản lý menu
1. Thêm món mới → reload app khách → thấy món đó.
2. Tắt công tắc "Còn hàng" → app khách hiện mờ + nhãn "Hết món", không chọn được.
3. Món đã nằm trong giỏ mà bị tắt → bấm Gửi đơn trả `ITEMS_UNAVAILABLE`, báo đúng tên món, giỏ không bị xoá.
4. **Đổi giá món khi phiên đang mở → bill của phiên đó KHÔNG đổi.**
5. Đổi thứ tự danh mục → app khách hiện đúng thứ tự mới.

### A8 — Bàn và mã QR
1. Thêm bàn mới → tự sinh `qrToken`.
2. Modal QR quét được bằng camera thật và ra đúng URL.
3. `/tables/print` in ra A4: mỗi ô có QR + tên bàn đọc rõ; không dính chữ khi cắt.
4. Sửa tên bàn **không** làm đổi `qrToken` (mã đã dán không hỏng).
5. Xoá bàn đang có khách → bị chặn, báo lỗi rõ ràng.

---

## B. Ngân sách hiệu năng — app khách

Đo bằng Chrome DevTools, throttle **Slow 4G + CPU 4× slowdown**, trên production build (`pnpm build && pnpm preview`).

| Chỉ số | Ngưỡng |
| --- | --- |
| Bundle JS initial (gzip) của `tableqr-guest` | **< 150 KB** |
| First Contentful Paint | < 1.8s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 (⇒ ảnh món bắt buộc có `width`/`height`) |
| Thời gian từ mở URL đến chạm được nút `+` đầu tiên | < 3s |
| Chuỗi thao tác quét → gửi đơn 2 món, người đã quen | **≤ 30s**, ≤ 8 lần chạm |

Vượt ngưỡng bundle thì phải cắt, không được nới ngưỡng.

---

## C. Chất lượng UI

- [ ] Mọi màn hình gọi dữ liệu có đủ **loading (skeleton) / rỗng / lỗi có nút thử lại / có dữ liệu**
- [ ] `tableqr-guest` không tràn ngang ở 375px; vùng chạm ≥ 44px
- [ ] `tableqr-staff` đọc được từ 80cm trên tablet 1024px
- [ ] Trạng thái đơn luôn có **chữ**, không chỉ dựa vào màu
- [ ] Nút chỉ có icon đều có `aria-label`
- [ ] Modal / bottom sheet: bẫy focus, `Esc` đóng, trả focus về chỗ cũ
- [ ] Tương phản chữ ≥ 4.5:1
- [ ] Mọi số tiền qua `formatVnd()` — không có `toLocaleString` rải rác trong component
- [ ] Không double-submit được đơn hàng
- [ ] Không có chuỗi tiếng Anh lọt vào giao diện

---

## D. Chất lượng kỹ thuật

- [ ] `pnpm lint && pnpm test && pnpm build` sạch toàn workspace
- [ ] Không có `any`, không có `@ts-ignore` thiếu giải thích
- [ ] Không `fetch` trực tiếp trong component
- [ ] Mọi endpoint trong `04-api-contract.md` có handler mock tương ứng
- [ ] Vitest phủ tối thiểu:
  - `formatVnd()` — gồm 0 đồng và số lớn
  - Cộng tiền giỏ hàng với `quantity > 1`
  - Gộp món trùng (cùng món, cùng ghi chú → cộng số lượng; khác ghi chú → tách dòng)
  - `calcSessionTotal()` qua nhiều `Order`, **loại đơn `CANCELLED`**
  - Bảng chuyển trạng thái đơn: chặn `SERVED → PREPARING`
- [ ] `VITE_USE_MOCK=false` không kéo MSW vào production bundle (dynamic import)

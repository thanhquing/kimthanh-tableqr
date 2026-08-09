# 04 — Câu hỏi chưa chốt

Mỗi mục ghi **giả định đang dùng tạm**. Cứ theo giả định mà làm; đừng dừng lại chờ trả lời, cũng đừng tự quyết khác.

Khi có câu trả lời: cập nhật `ai-docs` liên quan, ghi ngày chốt vào đây, chuyển mục xuống phần "Đã chốt".

---

## Đang mở

### Q1 — Đã quyết định chuyển "Reset bàn" thành đóng phiên thay vì xoá dữ liệu. Có đúng ý không?

Mô tả ban đầu viết *"toàn bộ dữ liệu order của bàn đó bị xóa"*. Hệ thống đang làm: đóng `TableSession`, giữ nguyên đơn.

**Giả định đang dùng:** đóng phiên, không xoá. Nhìn từ phía người dùng giống hệt (bàn trống, khách mới quét thấy menu sạch), nhưng còn dữ liệu để đối soát cuối ngày và để làm báo cáo doanh thu sau này. Nếu thật sự cần xoá cứng thì thêm nút riêng ở admin, không gộp vào Reset bàn.

### Q2 — Có bao nhiêu bàn, tên bàn đặt thế nào?

**Giả định:** 8 bàn, `code` = `B01`…`B08`, `displayName` = "Bàn 1"…"Bàn 8". Chủ quán tự sửa được ở `/tables`.

### Q3 — PIN nhân viên: chung một PIN cho cả quán, hay mỗi người một PIN?

**Giả định MVP:** một PIN chung cho cả quán. Quán nhỏ 2–3 người, không cần biết ai bấm nút nào. Nếu sau cần truy vết thì thêm `staff_user` — `ai-docs/03` chưa có bảng này, thêm sau không phá gì.

### Q4 — Món có tuỳ chọn (size S/M/L, thêm topping, độ cay) không?

**Giả định MVP: không.** Chỉ có ô ghi chú tự do + chip gợi ý. Mô tả ý tưởng chỉ nhắc "ít đá", "không rau", "thêm ớt" — đúng là ghi chú, không phải tuỳ chọn có giá.

Nếu sau cần: thêm `MenuItemOption` + `OrderItemOption`, và `unitPriceVndSnapshot` phải cộng cả giá option. **Đây là lý do phải giữ mọi phép cộng tiền trong `packages/contracts`** — đổi một chỗ là xong.

### Q5 — Phiên bàn có tự đóng sau bao lâu không ai đụng?

**Giả định MVP: không tự đóng.** Nhân viên đóng tay. Rủi ro: quên Reset thì khách mới ngồi vào bàn cũ sẽ thấy đơn của khách trước. Giảm rủi ro bằng cách hiện thời gian ngồi trên sơ đồ bàn (`ST-06`) để nhân viên dễ thấy bàn "ngồi 4 tiếng" là bất thường.

Cân nhắc ở M6: job tự đóng phiên `OPEN` quá 6 giờ.

### Q6 — Đa ngôn ngữ?

**Giả định MVP: chỉ tiếng Việt,** chuỗi viết thẳng trong component, không i18n. Quán nhỏ Việt Nam là đối tượng chính. Thêm i18n sau tốn công nhưng cơ học.

### Q7 — Ảnh món lấy từ đâu ở giai đoạn UI?

**Giả định:** file tĩnh trong `packages/mock/assets/`. Upload thật là `BE-09`.

Đã thử thực tế, kết quả ở **Q9** — khó hơn dự kiến.

### Q9 — Nguồn ảnh miễn phí không đủ chất lượng cho một số món. Lấy ảnh thật ở đâu?

**Đã thử (2026-08-02):**

| Nguồn | Kết quả |
| --- | --- |
| **Wikimedia Commons** | Tra được theo đúng tên món và có sẵn license + tác giả, nhưng là **kho ảnh bách khoa**: phần lớn là ảnh tư liệu chụp bằng điện thoại, không phải ảnh ẩm thực. 18/24 tải được, kiểm bằng mắt thì **4 ảnh sai hẳn món** (nước mía ra bánh kem, chè đậu xanh ra nồi đậu sống), 7 ảnh đúng món nhưng xấu. |
| **Openverse** (tổng hợp Flickr CC) | Lượng ảnh nhiều hơn, chất lượng chụp tốt hơn. Nhưng metadata chỉ ghi `"Food"` nên **bắt buộc kiểm bằng mắt**, và một số món Việt đặc thù (cà phê sữa đá, chè) vẫn trả về ảnh espresso / bánh trà xanh. |
| Unsplash / Pexels | Ảnh đẹp nhất, nhưng **cần API key** để tìm kiếm. Chưa thử. |

**Giả định đang dùng:** ghép hai nguồn trên, mỗi món tải 4 ứng viên rồi **chọn bằng mắt** — không để script tự quyết, vì metadata không đủ tin. Món nào không có ảnh đúng thì **đổi món trong fixture** (đúng quy tắc ở `ai-docs/08 §5`), không dùng ảnh gần đúng.

### Q10 — Thư viện ảnh chia sẻ giữa các quán?

**Ý tưởng người dùng:** chủ quán chọn ảnh món từ nguồn miễn phí có giấy phép rõ ràng, đồng thời ảnh họ tải lên có thể trở thành nguồn cho quán khác.

**Để sau MVP:** hệ thống hiện là một quán/một deploy và ảnh BE-09 nằm trên ổ đĩa cục bộ, nên không thể chia sẻ giữa deploy. Tính năng này cần kho đối tượng tập trung, mô hình đa quán, duyệt/opt-in của người tải và metadata giấy phép/tác giả. Không lấy ảnh trực tiếp từ Google Search vì kết quả không đồng nghĩa được phép tái sử dụng. Khi làm, ưu tiên nhà cung cấp có license/API rõ ràng hoặc thư viện cộng đồng có xác nhận quyền chia sẻ.

**Cần người dùng quyết** — ba đường:

1. **Xin API key Unsplash** (miễn phí, ~2 phút ở unsplash.com/developers). Chất lượng tốt nhất trên mỗi công bỏ ra.
2. **Dùng ảnh của quán thật** nếu dự án này có khách hàng cụ thể. Tốt nhất về mọi mặt — ảnh đúng món, đúng cách bày, và chính là ảnh sẽ chạy production.
3. **Chấp nhận chất lượng hiện tại** cho giai đoạn prototype. Vẫn là ảnh thật nên vẫn đánh giá được bố cục; đổi ảnh sau không phải sửa code, chỉ thay file cùng tên.

### Q8 — Deploy ở đâu?

**Giả định:** chưa quyết, không ảnh hưởng M0–M5. Cần chốt trước M7 vì `VITE_GUEST_BASE_URL` (URL nhúng trong mã QR) **phải ổn định vĩnh viễn** — đổi domain sau khi đã dán QR lên bàn nghĩa là in lại toàn bộ.

### Q11 — Cổng thanh toán và chính sách quá hạn cho SaaS?

Định hướng đã chốt: chủ quán tự đăng ký, dùng miễn phí 2 tháng rồi trả **100.000 VND/tháng**, không giới hạn đơn. Chưa chốt provider nhận tiền, thời gian ân hạn, retry/dunning và quyền guest/staff/admin khi quá hạn.

**Giả định thiết kế:** tạo `Subscription` có `trialEndsAt` cố định (2 tháng lịch từ lúc đăng ký), số tiền lịch sử được snapshot; trạng thái billing được kiểm ở một `EntitlementService`. Không code payment hoặc chặn quán khi chưa làm `SA-01`. Chi tiết ở [../ai-docs/10-saas-evolution.md](../ai-docs/10-saas-evolution.md).

---

## Đã chốt

| Ngày | Câu hỏi | Chốt |
| --- | --- | --- |
| 2026-08-01 | Chia mấy app? | 3: guest / staff / admin |
| 2026-08-01 | Stack frontend? | Tất cả Vite + React SPA |
| 2026-08-01 | Dữ liệu giai đoạn UI? | `packages/contracts` + MSW |
| 2026-08-01 | Thanh toán online VietQR/SePay? | **Không** trong MVP |
| 2026-08-01 | Báo cáo doanh thu / món bán chạy? | **Không** trong MVP |
| 2026-08-01 | Gọi thêm món nhiều lần trong 1 phiên? | **Có** |
| 2026-08-01 | Nút "Gọi nhân viên"? | **Có** |
| 2026-08-09 | Kiểm thử migration BE-01 | Docker Desktop đã chạy; migration `20260809000000_init` áp dụng thành công trên PostgreSQL 15, API readiness 200. |

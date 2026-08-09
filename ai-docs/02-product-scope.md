# 02 — Phạm vi sản phẩm (MVP)

## Nguyên tắc

Đây là hệ thống cho **quán nhỏ, quán lề đường** — nơi chỉ có một cái điện thoại hoặc máy tính bảng ở quầy. Mọi tính năng làm tăng chi phí phần cứng, tăng số bước thao tác, hoặc bắt khách đăng ký đều đi ngược mục tiêu.

Khi phân vân giữa hai phương án, chọn phương án **ít bước hơn cho khách**.

---

## CÓ trong MVP

### App khách (`tableqr-guest`)

- Mở menu từ URL trong mã QR, **không đăng nhập, không cài app**
- Xem menu theo danh mục, có ảnh, tên, giá
- Tìm kiếm món theo tên
- Món hết hàng hiển thị mờ + nhãn "Hết món", không chọn được
- Chọn số lượng, ghi chú riêng cho từng món
- Giỏ hàng tự tính tổng tiền
- Gửi đơn
- **Gọi thêm món nhiều lần trong cùng một phiên bàn**, tổng bill cộng dồn
- Xem lại các lần đã gọi và trạng thái từng lần
- Nút **Gọi nhân viên** và **Xin tính tiền**

### App bếp/quầy (`tableqr-staff`)

- Đăng nhập bằng PIN
- Bảng đơn theo thời gian đến, có báo hiệu đơn mới
- Chuyển trạng thái đơn: `NEW` → `PREPARING` → `SERVED`, và huỷ đơn
- Xem sơ đồ bàn với trạng thái trống / có khách
- Xem chi tiết phiên một bàn: tất cả các lần gọi, tổng bill
- Đánh dấu **Đã thanh toán** và **Reset bàn**
- Nhận thông báo "Gọi nhân viên" / "Xin tính tiền" kèm số bàn

### App chủ quán (`tableqr-admin`)

- Đăng nhập bằng email + mật khẩu
- CRUD danh mục và món ăn (tên, mô tả, giá, ảnh, danh mục, thứ tự)
- Bật/tắt nhanh "còn hàng / hết món"
- CRUD bàn
- Xem mã QR của từng bàn, và **trang in A4 nhiều mã QR một lượt** kèm số bàn
- Cấu hình thông tin quán: tên, logo

---

## KHÔNG có trong MVP

| Không làm | Lý do | Đã chừa chỗ sẵn |
| --- | --- | --- |
| **Thanh toán online tại bàn (VietQR / SePay)** | Người dùng chốt để sau. MVP dùng "gọi nhân viên tính tiền" — vốn là cách quán nhỏ Việt Nam vẫn làm. | `TableSession` có `closedAt`; `OrderItem` snapshot giá ⇒ tổng bill luôn tính được chính xác, thêm cổng thanh toán sau không phải migrate. |
| **Báo cáo doanh thu / món bán chạy** | Người dùng chốt để sau. | Không xoá cứng `Order` khi Reset bàn ⇒ dữ liệu lịch sử còn nguyên để dựng báo cáo bất cứ lúc nào. |
| Nhiều chi nhánh / nhiều quán trên một hệ thống | Runtime MVP đang là một quán/một deploy. | Đã có thiết kế và roadmap migration SaaS tại [10-saas-evolution.md](10-saas-evolution.md); chưa thay schema MVP trước `SA-03`. |
| Tích điểm, khuyến mãi, mã giảm giá | Ngoài phạm vi. | — |
| Đặt bàn trước | Ngoài phạm vi. Hệ thống này là "đã ngồi rồi mới dùng". | — |
| Quản lý kho / nguyên liệu | Ngoài phạm vi. Chỉ có cờ `isAvailable` bật tay. | — |
| App native iOS/Android | Đi ngược nguyên tắc "không cài app". | — |
| Đa ngôn ngữ (i18n) | MVP chỉ tiếng Việt, chuỗi viết thẳng trong component. | Ghi ở `ai-tasks/04-open-questions.md`. |
| In hoá đơn ra máy in nhiệt | Cần phần cứng thêm, đi ngược mục tiêu chi phí thấp. | — |

---

## Ranh giới hay bị hiểu nhầm

- **"Reset bàn" không phải là xoá dữ liệu.** Xem [01-business-flow.md §2](01-business-flow.md#khi-khách-về).
- **Khách không có tài khoản.** Đừng thêm màn hình "nhập tên", "nhập số điện thoại" dù nghe có vẻ tiện. Mỗi trường bắt nhập là một lý do để khách bỏ cuộc.
- **Không có giỏ hàng đồng bộ giữa hai điện thoại cùng bàn.** Giỏ là cục bộ trên máy khách; chỉ khi bấm Gửi đơn thì đơn mới thuộc về phiên chung. Đồng bộ giỏ realtime là phức tạp thừa cho MVP.
- **Đăng ký chủ quán và billing chưa thuộc runtime MVP.** Hướng mở rộng đã chốt: trial 2 tháng, sau đó 100.000 VND/tháng không giới hạn đơn. Xem [10-saas-evolution.md](10-saas-evolution.md); chỉ triển khai theo `SA-*` sau production foundation.

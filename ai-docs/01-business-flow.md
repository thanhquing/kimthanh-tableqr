# 01 — Luồng nghiệp vụ

## 1. Luồng khách hàng

### Bước 1 — Vào quán, tìm bàn trống

Khách tự tìm bàn và ngồi xuống. Không cần nhân viên dẫn chỗ, không cần đưa menu giấy. Trên bàn có sẵn một mã QR: dán ở góc bàn, hoặc gắn trên khung đựng tăm / gia vị.

**Hệ quả kỹ thuật:** mã QR là vật lý, dán một lần, không đổi. URL nhúng trong QR phải ổn định vĩnh viễn cho bàn đó. Nếu cần "vô hiệu hoá" một bàn thì xử lý ở phía server (`DiningTable.isActive`), không in lại mã.

### Bước 2 — Quét mã, xem menu

Khách quét bằng bất kỳ app nào có camera: Zalo, Momo, camera mặc định iOS/Android. Trình duyệt mở thẳng trang menu.

Ràng buộc tuyệt đối:
- **Không cài app.** Chạy trên trình duyệt di động thường.
- **Không đăng nhập, không đăng ký, không nhập số điện thoại.** Không có bất kỳ màn chắn nào giữa "quét" và "thấy món".
- Menu hiển thị: ảnh món, tên, giá, phân loại theo danh mục (đồ uống, khai vị, món chính, tráng miệng...).

Khi khách mở URL lần đầu, hệ thống tự **mở phiên bàn** (`TableSession`) nếu bàn đang trống. Nếu bàn đã có phiên đang mở, khách được gắn vào chính phiên đó — hai người cùng bàn quét hai điện thoại vẫn ăn chung một bill.

### Bước 3 — Chọn món và gửi đơn

Chọn món → bấm số lượng → giỏ hàng tự cập nhật tổng tiền. Mỗi món thêm được ghi chú riêng: "ít đá", "không rau", "thêm ớt". Bấm **Gửi đơn** → đơn đi thẳng vào hệ thống.

### Bước 4 — Chờ đồ ăn mang ra

Khách không phải làm gì thêm. Bếp nhận đơn theo đúng thứ tự gửi đến. Món xong, nhân viên mang ra bàn theo số bàn đã gắn với đơn.

Khách vẫn có thể **gọi thêm món** bất kỳ lúc nào: mở lại trang, chọn tiếp, gửi đơn lần 2, lần 3. Mỗi lần gửi là một `Order` mới với `sequenceNo` tăng dần, cùng thuộc một `TableSession`. Bếp nhìn thấy "Bàn 3 — lần gọi #2".

### Bước 5 — Thanh toán

MVP: khách bấm nút **Xin tính tiền** trên điện thoại (hoặc gọi nhân viên như bình thường). Nhân viên nhìn hệ thống là biết bàn đó đã gọi những gì, tổng bao nhiêu — không cần cộng tay.

Thanh toán online tại bàn (VietQR/SePay) **không thuộc MVP** — xem [02-product-scope.md](02-product-scope.md).

---

## 2. Luồng chủ quán / nhân viên

### Trước giờ mở cửa (làm một lần)

1. Chủ quán nhập menu vào hệ thống: tên món, giá, ảnh, danh mục.
2. Khai báo danh sách bàn.
3. In mã QR cho từng bàn (trang in A4 nhiều mã một lượt), dán lên bàn.

Xong. Không phải làm gì thêm mỗi ngày.

### Trong giờ phục vụ

Một điện thoại hoặc máy tính bảng để ở quầy mở màn hình nhận đơn. Khi khách gửi đơn:

1. Đơn mới hiện lên kèm **số bàn**, **danh sách món**, **ghi chú**, **thời gian gửi**. Có tín hiệu báo (highlight + chuông).
2. Bếp chế biến theo thứ tự đơn đến — hệ thống đã sắp sẵn, không ai phải nhớ ai gọi trước.
3. Nhân viên chuyển trạng thái đơn: `NEW` → `PREPARING` → `SERVED`.
4. Món xong, mang ra bàn đúng số.

Nếu khách bấm "Gọi nhân viên" hoặc "Xin tính tiền", màn hình quầy hiện thông báo kèm số bàn.

### Khi khách về

Nhân viên bấm **Đã thanh toán**, rồi **Reset bàn**. Bàn trở về trạng thái trống, sẵn sàng đón khách mới.

> **Điều chỉnh có chủ ý so với mô tả ban đầu.** Mô tả ý tưởng viết "toàn bộ dữ liệu order của bàn đó bị xóa". Hệ thống **không xóa cứng** — nó đóng `TableSession` (`status=CLOSED`, ghi `closedAt`). Kết quả nhìn từ phía người dùng giống hệt: bàn trống, khách mới quét vào là menu sạch, không thấy đơn cũ. Nhưng dữ liệu vẫn còn để đối soát cuối ngày và để làm báo cáo doanh thu sau này. Xóa cứng là mất vĩnh viễn, không lấy lại được.

---

## 3. Vòng đời phiên bàn

```
      Bàn EMPTY
          │
          │  khách quét QR lần đầu
          ▼
   TableSession OPEN ──────────┐
   Bàn -> OCCUPIED             │  khách quét thêm / gọi thêm món
          │                    │  (Order #1, #2, #3... cùng session)
          │ ◀──────────────────┘
          │
          │  nhân viên bấm "Đã thanh toán" -> "Reset bàn"
          ▼
   TableSession CLOSED (closedAt)
   Bàn -> EMPTY
```

Bất biến quan trọng: **mỗi bàn chỉ có tối đa MỘT `TableSession` ở trạng thái `OPEN` tại một thời điểm.**

---

## 4. Các trường hợp biên phải xử lý

| Tình huống | Hành vi mong muốn |
| --- | --- |
| Hai khách cùng bàn quét hai điện thoại | Cùng vào một `TableSession`. Cả hai đều gọi món được, chung một bill. |
| Khách quét mã của bàn đã bị xoá / vô hiệu hoá | Trang báo "Mã QR không hợp lệ, vui lòng gọi nhân viên". Không tạo phiên. |
| Khách gửi đơn rỗng | Nút Gửi đơn bị vô hiệu hoá khi giỏ trống. |
| Chủ quán sửa giá món khi phiên đang mở | Bill của phiên đang mở **không đổi** — `OrderItem` đã snapshot tên + giá lúc gửi đơn. |
| Chủ quán tắt "còn hàng" khi món đã nằm trong giỏ của khách | Lúc bấm Gửi đơn, server từ chối món đó và báo rõ món nào hết. Giỏ giữ nguyên các món còn lại. |
| Khách đóng trình duyệt rồi quét lại | Vẫn thấy các đơn đã gửi của phiên (nhờ phiên gắn theo bàn, không theo thiết bị). Giỏ hàng chưa gửi thì mất — chấp nhận được. |
| Nhân viên Reset bàn khi khách vẫn đang xem menu trên điện thoại | Lần thao tác tiếp theo của khách trả về lỗi phiên đã đóng; trang chuyển sang màn "Phiên đã kết thúc, quét lại để gọi món mới". |
| Mất mạng giữa chừng lúc gửi đơn | Hiện lỗi rõ ràng + nút "Thử lại". Không được im lặng nuốt đơn. |

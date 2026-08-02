# 05 — Đặc tả UI/UX

## Nguyên tắc chung

1. **Đếm số lần chạm.** Từ lúc menu hiện ra đến lúc đơn được gửi, một khách gọi 2 món phải xong trong ≤ 8 lần chạm.
2. **Mọi màn hình có đủ 4 trạng thái:** loading (skeleton, không phải spinner giữa màn), rỗng, lỗi (có nút thử lại), có dữ liệu. Dùng primitive dùng chung ở `packages/ui`.
3. **Không có dead-end.** Mọi màn lỗi phải có đường đi tiếp.
4. **Tiếng Việt tự nhiên,** như nhân viên quán nói: "Gửi đơn", "Gọi thêm món", "Xin tính tiền" — không phải "Xác nhận giao dịch", "Khởi tạo yêu cầu".
5. **Vùng chạm ≥ 44×44px** ở app khách và app bếp. Bếp thao tác bằng tay ướt, tay dính dầu.

---

# `tableqr-guest` — mobile-first

Thiết kế cho màn hình nhỏ nhất là **iPhone SE (375px)**. Không có breakpoint desktop nào ngoài việc giới hạn `max-width: 480px` và căn giữa.

## Layout khung

```
┌─────────────────────────────┐
│ Quán Cơm Kim Thành   Bàn 1  │  header dính, cao 56px
├─────────────────────────────┤
│ 🔍 Tìm món...               │
├─────────────────────────────┤
│ [Đồ uống][Món chính][Khai vị│  tab danh mục, cuộn ngang, DÍNH
├─────────────────────────────┤
│                             │
│  ┌────┐ Cà phê sữa đá       │
│  │ img│ Cà phê phin truyền..│  card món, chạm cả card
│  └────┘ 25.000 ₫       [ + ]│
│                             │
│  ┌────┐ Bún bò Huế          │
│  │ img│              HẾT MÓN│  mờ 45%, không chạm được
│  └────┘ 45.000 ₫            │
│                             │
├─────────────────────────────┤
│ 🛒 3 món · 95.000 ₫  [Xem giỏ]│ thanh nổi, chỉ hiện khi giỏ > 0
└─────────────────────────────┘
      ●  nút tròn "Gọi nhân viên" góc phải dưới
```

## Màn hình

### `/t/:qrToken` — Menu

- Header: tên quán + **số bàn nổi bật** (khách cần yên tâm mình đang gọi đúng bàn).
- Tab danh mục: cuộn ngang, dính dưới header, tab đang xem được tô đậm. Chạm tab → cuộn mượt tới nhóm đó (không chuyển route).
- Card món: ảnh vuông 88px bên trái, tên (tối đa 2 dòng), mô tả (1 dòng, xám), giá đậm, nút `+` tròn bên phải.
  - Chạm nút `+` → thêm thẳng 1 món vào giỏ (đường tắt, không mở sheet).
  - Chạm phần còn lại của card → mở sheet chi tiết.
- Món hết: `opacity: 0.45`, badge "Hết món", không chạm được, không hiện nút `+`.
- Tìm kiếm: lọc tại chỗ theo tên, bỏ dấu tiếng Việt khi so khớp ("ca phe" tìm ra "Cà phê").
- Ảnh: `loading="lazy"`, có `width`/`height` cố định để không giật layout, có placeholder màu khi chưa tải xong.

### `/t/:qrToken/item/:itemId` — Bottom sheet chi tiết

Trượt lên từ dưới, nền mờ phía sau, vuốt xuống hoặc chạm nền để đóng. Không phải trang riêng — đóng lại là về đúng vị trí cũ trong menu.

Nội dung: ảnh lớn 16:9 · tên · mô tả đầy đủ · giá · bộ đếm số lượng `[−] 1 [+]` · ô ghi chú với **chip gợi ý bấm được**: `ít đá` `không rau` `thêm ớt` `ít cay` `không hành` · nút chính `Thêm vào giỏ · 50.000 ₫` (hiện luôn thành tiền).

### `/t/:qrToken/cart` — Giỏ hàng

Danh sách món đã chọn, mỗi dòng có bộ đếm số lượng và nút xoá. Sửa ghi chú tại chỗ. Cuối trang: tổng tiền chữ to, nút **Gửi đơn** rộng hết chiều ngang.

- Giỏ rỗng → empty state "Chưa chọn món nào" + nút "Xem menu".
- Giảm số lượng về 0 → xoá dòng, hiện snackbar "Đã xoá {tên món}" kèm **Hoàn tác**.
- Đang gửi → nút chuyển sang loading, **chặn bấm lần hai** (kèm `X-Request-Id` chống trùng, xem `04-api-contract.md`).
- Lỗi `ITEMS_UNAVAILABLE` → giữ nguyên giỏ, đánh dấu đỏ đúng món đã hết, hiện thông báo tiếng Việt của server.

### `/t/:qrToken/success` — Đã gửi

Dấu tích lớn, "Đã gửi đơn tới bếp", tóm tắt món vừa gọi. Tự chuyển sang `/orders` sau 3 giây, có nút bỏ qua chờ.

### `/t/:qrToken/orders` — Đơn của bàn

Các lần gọi theo thứ tự, mỗi lần một thẻ: "Lần gọi #1 · 10:05" + badge trạng thái + danh sách món + thành tiền. Cuối trang: **tổng cộng cả phiên** chữ to. Hai nút: `Gọi thêm món` (chính) và `Xin tính tiền`.

Badge trạng thái: `NEW` = "Đã gửi bếp" (xám) · `PREPARING` = "Đang làm" (cam) · `SERVED` = "Đã phục vụ" (xanh) · `CANCELLED` = "Đã huỷ" (đỏ, gạch ngang).

### Nút nổi "Gọi nhân viên"

Nút tròn góc phải dưới, chạm mở menu nhỏ 2 lựa chọn: **Gọi nhân viên** / **Xin tính tiền**. Sau khi gửi, nút đổi thành "Đã báo nhân viên ✓" trong 30 giây và không bấm lại được — tránh khách bấm liên tục.

### Màn lỗi

| Tình huống | Hiển thị |
| --- | --- |
| `TABLE_NOT_FOUND` | "Mã QR không hợp lệ. Vui lòng gọi nhân viên hỗ trợ." Không có nút nào — đây là lúc cần con người. |
| `SESSION_CLOSED` | "Phiên gọi món đã kết thúc. Quét lại mã QR trên bàn để gọi món mới." |
| Mất mạng | "Không có kết nối mạng." + nút "Thử lại". Giỏ hàng giữ nguyên. |

---

# `tableqr-staff` — tablet-first

Thiết kế cho **máy tính bảng ngang 1024px** dựng ở quầy, đọc từ khoảng cách 50–80cm. Chữ to hơn bình thường, tương phản cao, nút lớn. Chạy được cả trên điện thoại (dồn về 1 cột).

### `/orders` — Bảng đơn (màn hình chính, mở suốt ca)

Ba cột: **Đơn mới** · **Đang làm** · **Đã phục vụ**. Trên điện thoại: một danh sách dọc, nhóm theo trạng thái.

Thẻ đơn:
```
┌───────────────────────────┐
│ Bàn 1        lần gọi #2   │  số bàn CHỮ TO NHẤT trên thẻ
│ 10:18  ·  2 phút trước    │
│ ─────────────────────────  │
│ 2× Cà phê sữa đá          │
│    ↳ ít đá                │  ghi chú thụt vào, màu nổi
│ 1× Bún bò Huế             │
│ ─────────────────────────  │
│ 50.000 ₫                  │
│ [   Bắt đầu làm       ]   │
└───────────────────────────┘
```

- Đơn `NEW` chưa xem: viền nổi + nền nhạt, nhấp nháy 3 giây khi vừa tới, kèm tiếng chuông ngắn (có nút tắt tiếng, lưu vào `localStorage`).
- Sắp xếp theo `createdAt` tăng dần — **ai gửi trước hiện trước**, đúng yêu cầu nghiệp vụ.
- Hiện "x phút trước" tự đếm, chuyển sang đỏ nếu đơn `NEW` quá 10 phút chưa ai đụng.
- Nút chính đổi theo trạng thái: `NEW` → "Bắt đầu làm" · `PREPARING` → "Đã phục vụ". Menu phụ (`⋯`) chứa "Huỷ đơn" (có xác nhận).
- Cập nhật lạc quan: bấm là đổi ngay, lỗi thì hoàn lại và hiện toast.

### `/tables` — Sơ đồ bàn

Lưới thẻ bàn. Trống = xám nhạt. Có khách = tô màu, hiện thời gian ngồi, số lần gọi, tổng tiền tạm tính. Chấm đỏ nếu bàn có `StaffCall` đang `PENDING`. Chạm → chi tiết phiên.

### `/tables/:code` — Chi tiết phiên

Tất cả các lần gọi của phiên + tổng bill chữ rất to (nhân viên đọc số này để thu tiền). Hai nút xếp theo trình tự:

1. **Đã thanh toán** — bấm xong nút này mới mở khoá nút dưới.
2. **Reset bàn** — hộp thoại xác nhận: *"Reset Bàn 1? Bàn sẽ về trạng thái trống, khách mới quét mã sẽ bắt đầu phiên mới. Đơn cũ vẫn được lưu lại."* — nói rõ để nhân viên không sợ mất dữ liệu.

Cho phép Reset khi chưa bấm "Đã thanh toán" (khách bỏ đi, quán vẫn cần dọn bàn), nhưng cảnh báo thêm một dòng đỏ.

### Header — thông báo gọi nhân viên

Chuông có badge số. Mở ra danh sách: "Bàn 3 · Xin tính tiền · 1 phút trước" + nút "Đã xử lý". `REQUEST_BILL` nổi bật hơn `CALL_STAFF`.

### `/login`

Bàn phím số lớn, nhập PIN 6 số. Ghi nhớ đăng nhập lâu — không ai muốn đăng nhập lại giữa giờ cao điểm.

---

# `tableqr-admin` — desktop-first

Sidebar trái: Menu · Bàn & mã QR · Cài đặt. Dùng được trên máy tính bảng dọc; điện thoại chỉ cần đọc được, không tối ưu sâu.

### `/menu`

Hai cột: danh sách danh mục bên trái, món của danh mục đang chọn bên phải. Mỗi dòng món có: ảnh thumbnail, tên, giá, **công tắc "Còn hàng"** (đổi là lưu ngay, không cần bấm Lưu), nút Sửa / Xoá. Kéo thả để đổi `sortOrder`.

Công tắc "Còn hàng" là thao tác dùng nhiều nhất trong ngày — phải ở ngay danh sách, không bắt mở form.

### `/menu/items/:id` (và `/menu/items/new`)

Form: danh mục · tên · mô tả · giá (nhập số, hiện định dạng `45.000 ₫` bên dưới ô) · ảnh · còn hàng · thứ tự. Rời trang khi chưa lưu → hỏi xác nhận.

### `/tables`

Bảng bàn: mã, tên hiển thị, trạng thái, nút "Xem mã QR" (mở modal có QR + nút tải PNG). Nút "In tất cả mã QR" → `/tables/print`.

### `/tables/print`

Trang riêng, không sidebar. Lưới mã QR khổ A4 (3×4 mỗi trang), mỗi ô: mã QR + **tên bàn chữ to** + tên quán + dòng hướng dẫn nhỏ "Quét mã để xem menu và gọi món". `@media print` bỏ mọi thứ trừ lưới, thêm `page-break-after`.

### `/settings`

Tên quán, logo, địa chỉ.

---

## Hệ thống thị giác

Token định nghĩa tại `packages/ui/src/theme.css` (Tailwind v4 `@theme`).

| Token | Dùng cho |
| --- | --- |
| `--color-brand` | Nút chính, tab đang chọn |
| `--color-surface` / `--color-surface-raised` | Nền trang / nền thẻ |
| `--color-text` / `--color-text-muted` | Chữ chính / chữ phụ |
| `--color-status-new` / `-preparing` / `-served` / `-cancelled` | Badge trạng thái đơn — **dùng chung cho cả guest và staff** để khách và nhân viên nói cùng một ngôn ngữ màu |
| `--color-danger` | Huỷ, xoá, cảnh báo |

Trạng thái đơn **không được phân biệt chỉ bằng màu** — luôn kèm chữ (a11y, và quán sáng chói nhìn màu không rõ).

Chữ: font hệ thống (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) — không tải webfont, tiết kiệm round-trip trên 4G và hiển thị tiếng Việt có dấu chuẩn.

## Định dạng

- Tiền: `45.000 ₫` — dấu chấm ngăn nghìn, ký hiệu ₫ phía sau, có khoảng trắng. Luôn qua `formatVnd()` ở `packages/contracts`.
- Giờ: `10:18` (24h). Thời gian tương đối: "vừa xong" (<1 phút), "3 phút trước", "1 giờ trước".

## Accessibility tối thiểu

- Tương phản chữ ≥ 4.5:1.
- Mọi nút chỉ có icon phải có `aria-label`.
- Bottom sheet và modal: bẫy focus, đóng bằng `Esc`, trả focus về nơi đã mở.
- Toast/snackbar: `role="status"` để trình đọc màn hình đọc được.

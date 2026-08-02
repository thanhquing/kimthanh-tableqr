# 08 — Design system

Giá trị cụ thể để dán thẳng vào `packages/ui/src/theme.css`. `ai-docs/05` mô tả *màn hình trông thế nào*; file này định nghĩa *bằng con số nào*.

Mọi cặp màu dưới đây **đã kiểm tương phản WCAG bằng máy**, không ước lượng. Tỉ lệ ghi ngay cạnh. Đổi màu thì phải kiểm lại, đừng đổi bằng cảm giác.

---

## 1. Hướng thiết kế

Đây là quán ăn Việt Nam, không phải SaaS dashboard. Ba điều kiện vật lý quyết định mọi lựa chọn:

| Điều kiện thật | Hệ quả thiết kế |
| --- | --- |
| Khách ngồi **ngoài trời, nắng gắt**, điện thoại Android rẻ độ sáng thấp | Tương phản cao. **Không** dùng chữ xám nhạt trên nền xám. Không low-contrast "tinh tế". |
| Tay khách **bận, có thể dính dầu mỡ**, đang đói, kiên nhẫn ~30 giây | Vùng chạm to, thao tác ít, giá tiền phải đập vào mắt |
| **Ảnh món là nội dung chính** — khách quyết định bằng mắt | UI phải lùi lại nhường chỗ cho ảnh. Nền trắng, viền mảnh, không đổ bóng nặng. |

Tham chiếu đúng: **ShopeeFood / GrabFood / Baemin** (app khách) — không phải Stripe, không phải Linear, không phải landing page SaaS.

Tính cách màu: **ấm** (đỏ cam ớt, be gạo), không phải xanh dương lạnh. Xanh dương là màu ngân hàng và phần mềm doanh nghiệp; đặt cạnh ảnh đồ ăn nó đánh nhau.

---

## 2. Màu

### Brand — đỏ cam ấm

```css
--color-brand-50:  #FDF3F0;   /* nen chip dang chon, nen nhat */
--color-brand-100: #FADFD8;   /* vien chip dang chon */
--color-brand-500: #E05A3F;   /* trang tri, khong dung cho chu */
--color-brand-600: #C93D22;   /* NEN nut chinh — chu trang 5.03:1 PASS */
--color-brand-700: #A6301A;   /* hover/pressed; CHU tren nen trang 6.86:1 PASS */
--color-brand-900: #6B1E10;   /* tieu de nhan manh */
```

Quy tắc: chữ màu brand trên nền trắng **luôn dùng `brand-700`**, không dùng `500`/`600` (không đạt 4.5:1).

### Trung tính — tông ấm (stone), không phải xám lạnh

```css
--color-ink-900: #1C1917;   /* chu chinh          17.49:1 PASS */
--color-ink-700: #44403C;   /* chu phu dam                     */
--color-ink-600: #57534E;   /* chu phu             7.63:1 PASS */
--color-ink-500: #78716C;   /* placeholder, chu mo 4.80:1 PASS */
--color-line-200: #E7E5E4;  /* vien mac dinh */
--color-line-300: #D6D3D1;  /* vien input, vien nhan manh */
--color-surface: #FFFFFF;
--color-surface-sunken: #FAF9F7;  /* nen trang */
--color-image-placeholder: #EFEBE7; /* nen o anh khi chua tai — AM, khong phai #EEE lanh */
```

> **Không dùng `#A8A29E` cho chữ** — chỉ đạt 2.52:1. Đây là màu xám AI hay chọn cho placeholder và nó không đọc được ngoài nắng.

### Trạng thái đơn — dùng chung guest + staff

Khách và nhân viên phải nói cùng một ngôn ngữ màu.

```css
--color-status-new-fg:        #44403C;  --color-status-new-bg:        #F5F5F4;  /* 9.42:1 PASS */
--color-status-preparing-fg:  #B45309;  --color-status-preparing-bg:  #FEF3C7;  /* 4.51:1 PASS */
--color-status-served-fg:     #15803D;  --color-status-served-bg:     #DCFCE7;  /* 4.57:1 PASS */
--color-status-cancelled-fg:  #B91C1C;  --color-status-cancelled-bg:  #FEE2E2;  /* 5.30:1 PASS */
```

Badge trạng thái **luôn kèm chữ**, không bao giờ chỉ có màu.

### Ngữ nghĩa

```css
--color-danger:  #B91C1C;   /* chu trang 6.47:1 PASS — huy, xoa */
--color-success: #15803D;   /* chu trang 5.02:1 PASS */
--color-warning: #B45309;
--color-focus:   #C93D22;   /* vien focus, luon nhin thay duoc */
```

---

## 3. Chữ

Font hệ thống — không tải webfont (ngân sách < 150 KB, xem `ai-docs/07`):

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

Nâng cấp sau MVP nếu muốn có cá tính: self-host **Be Vietnam Pro** (font thiết kế riêng cho dấu tiếng Việt), subset `vietnamese`, `font-display: swap`. Ghi ở `ai-tasks/04-open-questions.md`, không làm ở MVP.

### Thang chữ — app khách (nền 16px)

| Vai trò | size/line | weight | Ghi chú |
| --- | --- | --- | --- |
| Tổng tiền | 28/34 | 700 | Số to nhất màn hình |
| Tiêu đề màn | 20/26 | 700 | |
| Tên món | 17/24 | 600 | Tối đa 2 dòng rồi `…` |
| Giá món | 17/24 | 700 | **`tabular-nums`** |
| Body | 15/22 | 400 | |
| Mô tả / caption | 13/18 | 400 | Màu `ink-600`, **không** `ink-500` |

**Không có chữ nào dưới 13px** ở app khách. Ngoài nắng, 12px là không đọc được.

```css
/* Bat buoc cho MOI so tien va so luong — de cot gia thang hang */
font-variant-numeric: tabular-nums;
```

Chi tiết này là thứ phân biệt "designer làm" với "làm cho có": giá `25.000 ₫` và `145.000 ₫` xếp chồng phải thẳng cột số.

### App bếp (tablet, nhìn từ 80cm)

Nền **18px**. Số bàn **32/36 weight 800** — to nhất trên thẻ đơn. Body tối thiểu 15px. Tên món trong đơn 17px.

### App admin (desktop, dense)

Nền **14px**. Bảng dòng cao 44px. Đây là chỗ duy nhất được dense.

---

## 4. Khoảng cách, bo góc, đổ bóng

```css
/* Thang 4px. Khong dung gia tri ngoai thang nay. */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;

--radius-sm: 6px;    /* input, chip */
--radius-md: 8px;    /* nut, card  <- MAC DINH */
--radius-lg: 12px;   /* anh mon, panel lon */
--radius-sheet: 16px 16px 0 0;   /* bottom sheet, chi bo goc tren */
--radius-pill: 999px;            /* CHI cho badge, chip, nut tron icon */
```

**Bo góc tối đa 12px** cho khối chữ nhật. `rounded-full` cho card/nút chữ nhật là dấu hiệu template AI.

```css
--shadow-sm: 0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.08);
--shadow-md: 0 4px 12px rgba(28,25,23,.10);
--shadow-sheet: 0 -8px 32px rgba(28,25,23,.16);
```

**Chỉ ba mức này.** Không `shadow-xl`, không `shadow-2xl`. Phân tách khối bằng **viền `line-200` + nền**, không bằng bóng — bóng nặng làm ảnh món trông rẻ tiền.

### Vùng chạm

| App | Tối thiểu |
| --- | --- |
| Khách | 44×44 px |
| Bếp | **56×56 px** (tay bận, tay ướt) |
| Admin | 36×36 px |

---

## 5. Ảnh món — phần quan trọng nhất

Ảnh chiếm ~70% diện tích nhìn thấy của app khách. Làm sai chỗ này thì mọi thứ khác vô nghĩa.

### Yêu cầu bắt buộc

| Hạng mục | Quy định |
| --- | --- |
| **Nội dung** | Ảnh phải **đúng món**. "Cà phê sữa đá" là ly cà phê sữa có đá — không phải cappuccino, không phải ảnh cà phê chung chung. Ảnh sai món tệ hơn không có ảnh. |
| Tỉ lệ | Ảnh gốc **1:1**, 800×800. Card list crop 1:1; sheet chi tiết crop 16:9 bằng `object-fit: cover`. Một file dùng cho cả hai. |
| Định dạng | JPEG q80 (hoặc WebP), **≤ 90 KB/ảnh** |
| Kích thước render | Card 88×88 CSS px ⇒ ảnh ≥ 176px cho màn 2x |
| Thuộc tính | **Bắt buộc có `width` + `height`** trên thẻ `<img>`. CLS < 0.1 là ngưỡng nghiệm thu. |
| Tải | `loading="lazy"` + `decoding="async"`, trừ 4 ảnh đầu tiên (`loading="eager"` — chúng nằm trong màn hình đầu) |
| Chưa tải xong | Nền `--color-image-placeholder` (`#EFEBE7`). **Không spinner**, không skeleton nhấp nháy trên từng ảnh. |
| Không có ảnh | Ô nền `#EFEBE7` + chữ cái đầu tên món màu `ink-500`. Không dùng icon "ảnh vỡ". |

### Nguồn ảnh giai đoạn UI

Tải về `packages/mock/assets/` — **không hotlink CDN**: app phải chạy được khi mất mạng, và ảnh phải cố định để so sánh giữa các lần chỉnh giao diện.

Đặt tên theo slug món: `ca-phe-sua-da.jpg`, `bun-bo-hue.jpg`. Ghi nguồn + giấy phép vào `packages/mock/assets/CREDITS.md`.

---

## 6. Chuyển động

Chỉ dùng khi nó **giải thích một thay đổi trạng thái**, không dùng để trang trí.

```css
--ease: cubic-bezier(.2, 0, 0, 1);
--dur-fast: 120ms;   /* nut nhan, doi mau */
--dur-base: 200ms;   /* mo/dong sheet, chuyen tab */
```

Không animation nào quá 250ms. Tôn trọng `prefers-reduced-motion: reduce` → tắt hết, chỉ đổi opacity.

---

## 7. Danh sách cấm

Đây là các dấu hiệu nhận biết giao diện do AI sinh ra. Xuất hiện bất kỳ mục nào = chưa đạt.

- ❌ Gradient tím/xanh dương (`from-purple-500 to-indigo-600` và họ hàng)
- ❌ Glassmorphism / `backdrop-blur` rải khắp nơi
- ❌ Emoji dùng làm icon (🍜 🛒 ✅) — dùng `lucide-react`, nét 1.5–2px, cỡ nhất quán
- ❌ `shadow-xl` / `shadow-2xl`, bóng màu
- ❌ Bo góc `rounded-full` cho card hoặc nút chữ nhật
- ❌ Mọi khối đều là card. Card chỉ dành cho **item lặp lại** (món, đơn, bàn) và panel/modal.
- ❌ Hero căn giữa + tagline marketing ở app công cụ
- ❌ Chữ xám nhạt dưới 4.5:1
- ❌ Blob/orb/hình trang trí bay lượn
- ❌ Nhiều hơn **một** màu brand. Màu còn lại chỉ để chỉ trạng thái.
- ❌ Ảnh stock sai món, hoặc ô xám thay ảnh
- ❌ Chữ tiếng Anh lọt vào giao diện

---

## 8. Bản sắc riêng của từng app

Dùng chung token, **khác nhau về mật độ và trọng tâm**:

| App | Cảm giác phải có | Trọng tâm thị giác |
| --- | --- | --- |
| `tableqr-guest` | App đặt món tiêu dùng, ấm, ảnh dẫn dắt, ngón cái với tới mọi thứ | **Ảnh món + giá** |
| `tableqr-staff` | Bảng điều hành ca làm việc: thoáng, chữ to, đọc lướt từ xa, không trang trí | **Số bàn + tên món** |
| `tableqr-admin` | Công cụ quản trị dense, table-first, thao tác nhanh bằng chuột | **Bảng + công tắc Còn hàng** |

Ba app không được nhìn như ba sản phẩm khác nhau, cũng không được nhìn y hệt nhau. Chung màu và chung component; khác thang chữ và mật độ.

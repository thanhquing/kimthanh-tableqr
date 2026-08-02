# 11 — Prompt dựng UI

Cách viết prompt để Opus 5 / Codex / Gemini dựng ra giao diện **nhìn như designer làm**, không phải "làm cho có".

---

## 1. Vì sao UI do AI dựng thường xấu

Bốn nguyên nhân. Mỗi cái có một cách chặn cụ thể — không phải viết prompt dài hơn.

| Nguyên nhân | Biểu hiện | Cách chặn |
| --- | --- | --- |
| **Prompt cho tính từ, không cho giá trị.** "Đẹp, hiện đại, chuyên nghiệp" không phải chỉ dẫn — model buộc phải đoán, và nó đoán ra thứ an toàn nhất: chính là template AI. | Gradient tím, card bo tròn giống hệt nhau, `shadow-2xl` | Dán nguyên **bảng token có hex thật** từ [`ai-docs/08-design-system.md`](../ai-docs/08-design-system.md). Cấm mọi giá trị ngoài bảng. |
| **Không có nội dung thật.** "Item 1 / Lorem ipsum / ô ảnh xám" không tạo ra được áp lực bố cục nào, nên bố cục ra vô hồn. | Card nào cũng vừa khít, không có tên dài tràn dòng, giá không thẳng cột | Bắt buộc **tên món tiếng Việt thật, giá thật, ẢNH THẬT**. Xem §3. |
| **Model không nhìn thấy thứ nó vừa làm.** Nó viết CSS rồi đoán kết quả. | Chữ đè lên nhau, khoảng cách lệch, tràn ngang ở mobile | Bắt **chạy app → chụp màn hình → tự chấm theo rubric → sửa**. Xem §5. Đây là đòn bẩy lớn nhất. |
| **Không có tham chiếu.** "App gọi món" quá rộng. | Ra một trang landing SaaS chung chung | Chỉ **đích danh sản phẩm thật**: ShopeeFood, GrabFood, Baemin. |

---

## 2. Quy trình — đừng nhảy thẳng vào React

Bốn bước. Bỏ bước nào cũng phải trả giá gấp đôi ở bước sau.

```
B1  Design system    ai-docs/08 — token có hex thật, đã kiểm tương phản   ✅ XONG
B2  Ảnh + nội dung   24 ảnh món Việt thật + tên + giá + mô tả  →  WS-02
B3  Prototype nhìn   1 file HTML tĩnh, màn menu khách, ảnh thật →  WS-08
    được ngay        MỞ RA XEM. Chỉnh tới khi ưng. Chốt look.
B4  Code React       Dựng lại đúng prototype đã chốt            →  GU-00…
```

**Vì sao phải có B3.** Prototype HTML một file mở bằng trình duyệt là **cách rẻ nhất để nhìn thấy UI/UX thật sự trông thế nào**. Sửa một dòng CSS rồi F5 mất 2 giây. Cũng thay đổi đó trong React sau khi đã có router + Query + MSW thì mất 2 phút và kéo theo rủi ro. Chốt thẩm mỹ ở chỗ rẻ, rồi mới sang chỗ đắt.

Đây cũng đúng cách bạn đã làm ở `kimthanh-tutor` (`ai-tasks/08-lovable-ui-prompts.md`).

---

## 3. Ảnh thật — không thương lượng

> Menu món ăn render bằng ô xám thì **không đánh giá được UI**. Ảnh chiếm ~70% diện tích nhìn thấy của app khách. Bố cục hợp lý với ô xám có thể vỡ hoàn toàn khi thả ảnh thật vào.

Trước khi dựng bất kỳ màn hình khách nào, phải có sẵn:

- **24 ảnh món ăn Việt Nam thật**, tải về `packages/mock/assets/`, đặt tên theo slug (`ca-phe-sua-da.jpg`)
- Ảnh **đúng món**: "cà phê sữa đá" phải là ly cà phê sữa có đá. Ảnh sai món **tệ hơn không có ảnh** — nó làm cả bản demo mất tin cậy.
- 800×800, JPEG q80, ≤ 90 KB
- `CREDITS.md` ghi nguồn + giấy phép

Nguồn: Unsplash / Pexels (giấy phép thoáng, đã kiểm tra truy cập được). Ảnh chụp món Việt trên Unsplash không đủ hết — món nào không tìm được ảnh đúng thì **đổi món trong fixture**, đừng dùng ảnh gần đúng.

Quy cách kỹ thuật đầy đủ: [`ai-docs/08 §5`](../ai-docs/08-design-system.md).

---

## 4. Khung prompt — 8 khối

Thứ tự này có chủ đích: bối cảnh trước ràng buộc, ràng buộc trước nội dung, tự chấm sau cùng.

```
1. VAI TRÒ + BỐI CẢNH VẬT LÝ   Ai dùng, ở đâu, tay đang làm gì, màn hình nào
2. THAM CHIẾU                  Tên sản phẩm thật, kèm cái gì lấy / cái gì không
3. MÀN HÌNH + GIẢI PHẪU        Từng vùng từ trên xuống, kèm sơ đồ ASCII
4. TOKEN                       Dán nguyên hex. "Không dùng giá trị ngoài bảng."
5. NỘI DUNG THẬT               Tên món + giá + đường dẫn ảnh thật
6. BỐN TRẠNG THÁI              loading / rỗng / lỗi / có dữ liệu
7. DANH SÁCH CẤM               ai-docs/08 §7
8. VÒNG LẶP TỰ CHẤM            Chạy → chụp → chấm → sửa → lặp
```

Khối 8 là khối hay bị bỏ nhất và cũng là khối có tác dụng lớn nhất.

---

## 5. Vòng lặp tự chấm — đoạn đáng giá nhất

Dán nguyên đoạn này vào cuối mọi prompt dựng UI:

```text
Sau khi viết xong code, BẮT BUỘC làm tiếp, không được dừng ở đây:

1. Chạy app và chụp màn hình ở ĐÚNG 3 khổ:
   - 375×667  (iPhone SE — khổ nhỏ nhất phải chạy được)
   - 768×1024 (tablet)
   - 1440×900 (desktop)
2. NHÌN vào ảnh chụp, tự chấm theo rubric 20 điểm bên dưới.
3. Với mỗi mục trượt: nói rõ trượt ở đâu, sửa, chụp lại.
4. Lặp cho tới khi đạt tối thiểu 18/20.
5. Báo cáo điểm cuối cùng và những gì đã sửa qua từng vòng.

Không được tự nhận "đã đẹp" mà không chụp màn hình. Không được sửa mà
không chụp lại.
```

### Rubric 20 điểm

Mỗi mục 1 điểm.

**Bố cục & khoảng cách**
1. Mọi khoảng cách nằm trên thang 4px, không có số lẻ
2. Ở 375px không tràn ngang, không cần cuộn dọc để thấy nút chính
3. Nhịp dọc đều — khoảng cách giữa các item bằng nhau
4. Có phân cấp rõ: nhìn 1 giây biết đâu là thứ quan trọng nhất

**Chữ**
5. Không quá 4 cỡ chữ trên một màn
6. Không có chữ nào dưới 13px (app khách)
7. Số tiền dùng `tabular-nums`, cột giá thẳng hàng
8. Tên món dài bị cắt bằng `…` chứ không đẩy vỡ bố cục

**Màu & tương phản**
9. Chỉ dùng hex có trong bảng token
10. Chữ trên nền đạt ≥ 4.5:1 (kiểm bằng máy, không bằng mắt)
11. Đúng **một** màu brand; màu khác chỉ để chỉ trạng thái
12. Trạng thái phân biệt bằng **màu + chữ**, không chỉ màu

**Ảnh**
13. Ảnh thật, **đúng món**, không phải ô xám
14. `<img>` có `width` + `height`; đổi tab qua lại không thấy layout nhảy
15. Ảnh crop `object-fit: cover`, không bị bóp méo tỉ lệ

**Component**
16. Nút phân cấp rõ: primary / secondary / ghost / danger — CTA chính không bị tranh chấp
17. Đủ hover / focus-visible / active / disabled
18. Đủ 4 trạng thái màn hình: loading (skeleton) / rỗng / lỗi có nút thử lại / có dữ liệu

**Tổng thể**
19. Không dính mục nào trong danh sách cấm ở `ai-docs/08 §7`
20. Đặt cạnh ảnh chụp màn hình ShopeeFood — **nhìn có ra cùng một hạng sản phẩm không?** Nếu rõ ràng nghiệp dư hơn, chưa đạt.

Mục 20 là mục thật sự quan trọng. 19 mục trên là điều kiện cần.

---

## 6. Prompt sẵn — Prototype màn menu khách (`WS-08`)

Đây là màn hình quan trọng nhất của cả hệ thống. Làm đúng màn này thì hai app sau kế thừa được.

```text
Dựng một prototype HTML TĨNH, MỘT FILE (`prototype/guest-menu.html`), mở
bằng trình duyệt là chạy. Không framework, không build tool, không npm.
CSS đặt trong <style>, JS trong <script>. Chỉ tham chiếu ảnh cục bộ từ
../packages/mock/assets/.

MỤC ĐÍCH: chốt thẩm mỹ trước khi code React. Nó phải trông như sản phẩm
thật để nhìn phát biết UI/UX ra sao — không phải wireframe.

--- BỐI CẢNH ---
Quán ăn nhỏ Việt Nam, có thể là quán lề đường. Khách vừa ngồi xuống bàn
nhựa, quét mã QR dán trên bàn, điện thoại Android tầm trung, NGỒI NGOÀI
TRỜI NẮNG. Đang đói, kiên nhẫn khoảng 30 giây. Một tay cầm điện thoại.
Đây là màn hình đầu tiên khách nhìn thấy.

--- THAM CHIẾU ---
ShopeeFood và GrabFood ở khổ mobile.
LẤY: ảnh dẫn dắt, giá nổi bật, thanh giỏ hàng nổi dưới cùng, chip danh
     mục cuộn ngang, mật độ thông tin cao mà vẫn thoáng.
KHÔNG LẤY: banner khuyến mãi, quảng cáo, gamification, huy hiệu, đếm
     ngược, "flash sale".
KHÔNG tham chiếu Stripe / Linear / landing page SaaS.

--- GIẢI PHẪU MÀN HÌNH (từ trên xuống) ---
1. Header dính, cao 56px: tên quán bên trái; bên phải là chip "Bàn 1" —
   phải nổi bật, khách cần yên tâm đang gọi đúng bàn.
2. Ô tìm kiếm, cao 44px, icon kính lúp, placeholder "Tìm món...".
3. Chip danh mục cuộn ngang, DÍNH dưới header: Tất cả · Đồ uống ·
   Khai vị · Món chính · Tráng miệng. Chip đang chọn nền brand-50,
   viền brand-100, chữ brand-700.
4. Danh sách món nhóm theo danh mục, mỗi nhóm có tiêu đề dính nhỏ.
   Thẻ món, cao 104px:
   ┌──────────────────────────────────────┐
   │ ┌──────┐  Cà phê sữa đá              │
   │ │ ẢNH  │  Cà phê phin truyền thống   │
   │ │ 88px │  25.000 ₫              (+)  │
   │ └──────┘                             │
   └──────────────────────────────────────┘
   - Ảnh 88×88, radius-lg, object-fit: cover
   - Tên 17px/600, tối đa 2 dòng rồi …
   - Mô tả 13px màu ink-600, 1 dòng rồi …
   - Giá 17px/700, tabular-nums
   - Nút (+) tròn 44px, nền brand-600, dấu cộng trắng
   - Phân tách các thẻ bằng ĐƯỜNG KẺ 1px line-200, KHÔNG phải card có
     bóng. Danh sách kẻ dòng đọc nhanh hơn và nhường chỗ cho ảnh.
5. Món hết hàng: ảnh grayscale + opacity .45, badge "Hết món", KHÔNG có
   nút (+), không bấm được.
6. Thanh giỏ nổi dưới cùng (chỉ hiện khi giỏ > 0), cao 64px, bóng đổ lên:
   trái "3 món · 95.000 ₫", phải nút "Xem giỏ" nền brand-600.
7. Nút tròn 56px góc phải dưới, icon chuông, "Gọi nhân viên" —
   đặt CAO HƠN thanh giỏ, không đè lên nhau.

--- TOKEN: dùng đúng, không thêm giá trị ngoài bảng ---
[dán nguyên §2, §3, §4 của ai-docs/08-design-system.md vào đây]

--- NỘI DUNG: dùng đúng dữ liệu này, không tự chế ---
[dán 24 món từ packages/mock/src/fixtures.ts: tên, mô tả, giá, đường dẫn
 ảnh. Phải có ít nhất: 1 tên món dài tràn 2 dòng, 2 món hết hàng,
 1 mô tả rất dài để kiểm cắt chữ]

--- TƯƠNG TÁC (vanilla JS) ---
- Bấm (+) → thêm vào giỏ, thanh giỏ trượt lên, số và tổng tiền cập nhật
- Bấm thẻ món → bottom sheet: ảnh 16:9, mô tả đầy đủ, bộ đếm [−] 1 [+],
  ô ghi chú + chip gợi ý (ít đá / không rau / thêm ớt / ít cay),
  nút "Thêm vào giỏ · 50.000 ₫" cập nhật tiền theo số lượng
- Sheet: đóng bằng vuốt xuống / chạm nền / Esc; bẫy focus; trả focus về
  thẻ đã mở
- Chip danh mục → cuộn mượt tới nhóm; chip tự sáng theo vị trí cuộn
- Tìm kiếm → lọc tại chỗ, BỎ DẤU khi so khớp ("ca phe" ra "Cà phê")
- Nút chuông → menu 2 lựa chọn, chọn xong đổi thành "Đã báo nhân viên ✓"

--- CẤM ---
[dán §7 của ai-docs/08-design-system.md]

--- BỐN TRẠNG THÁI ---
Thêm hàng nút dev trên cùng (prototype mới có, React thì bỏ) để chuyển
qua lại: Loading (skeleton) / Rỗng / Lỗi có nút thử lại / Có dữ liệu.
Cả bốn phải dựng thật, không phải chú thích suông.

--- TỰ CHẤM ---
[dán nguyên §5 của file này]
```

## 7. Prompt cho app bếp và app admin

Dùng lại khung 8 khối, đổi khối 1, 2, 3:

**`tableqr-staff`** — Bối cảnh: máy tính bảng dựng ở quầy, mở suốt ca 8 tiếng, nhân viên liếc từ **80cm** trong lúc tay đang bưng bê. Tham chiếu: **màn hình KDS của Toast / Square** (bảng đơn nhà bếp), không phải dashboard analytics. Trọng tâm: **số bàn 32px/800 là chữ to nhất thẻ**; ghi chú món ("ít đá") phải nổi vì đó là thứ làm sai đơn; vùng chạm **56px**; không trang trí; không biểu đồ.

**`tableqr-admin`** — Bối cảnh: chủ quán ngồi máy tính **trước giờ mở cửa**, nhập một loạt món; trong ca chỉ mở để bật/tắt "hết món". Tham chiếu: bảng quản trị dense table-first (Stripe Dashboard hợp ở đây). Trọng tâm: **công tắc "Còn hàng" ngay trên dòng, đổi là lưu ngay** — thao tác dùng nhiều nhất trong ngày; bảng dòng 44px; nền 14px.

---

## 8. Sai lầm hay gặp khi viết prompt

| Đừng viết | Viết thay bằng |
| --- | --- |
| "Làm UI đẹp, hiện đại, chuyên nghiệp" | Dán bảng token + tên sản phẩm tham chiếu |
| "Dùng màu đẹp" | `--color-brand-600: #C93D22` (chữ trắng 5.03:1) |
| "Responsive" | "375 / 768 / 1440 — chụp cả ba, mobile không phải desktop co nhỏ" |
| "Thêm ảnh minh hoạ" | "`../packages/mock/assets/ca-phe-sua-da.jpg`, 88×88, object-fit: cover" |
| "Dựng app khách" | "Dựng **màn menu**, giải phẫu 7 vùng như dưới đây" |
| "Xử lý lỗi" | "Bốn trạng thái, dựng thật cả bốn, có nút dev để chuyển qua lại" |
| (không nói gì về kiểm tra) | "Chụp màn hình → chấm rubric 20 điểm → sửa → lặp tới ≥ 18/20" |

**Một màn hình một prompt.** "Dựng cả app khách" luôn ra kết quả tệ hơn 6 prompt cho 6 màn — model dàn đều sự chú ý và không màn nào được chăm.

---

## 9. Đọc HTML 30 giây để biết AI làm đúng hay ẩu

Không cần mở trình duyệt. Mở file HTML, lướt mắt tìm 10 dấu hiệu dưới đây — **thấy dấu hiệu đỏ nào là biết chưa đọc doc**, khỏi cần review tiếp.

### Chạy trước một lệnh

```bash
# Dan do -> lam lai. Khong ket qua -> di tiep phan doc mat.
grep -nE "linear-gradient.*(purple|indigo|violet)|backdrop-filter|toLocaleString|\
placeholder\.com|via\.placeholder|picsum|unsplash\.com|lorem|Item [0-9]|\
0 25px|shadow-2xl|#999|#aaa|#ccc\b" prototype/*.html
```

### Bảng đối chiếu

| # | Dấu hiệu **ĐÚNG** (phải có) | Dấu hiệu **SAI** (thấy là hỏng) |
| --- | --- | --- |
| 1 | `:root{--brand-600:#C93D22 …}` — hex khớp `ai-docs/08` | Hex lạ, `purple`, `indigo`, `#6366f1`, gradient tím |
| 2 | `font-variant-numeric:tabular-nums` ở chỗ tiền | Không có → cột giá sẽ so le |
| 3 | `<img … width="88" height="88">` — **thuộc tính**, không chỉ CSS | Thiếu `width`/`height` → CLS vỡ, trượt nghiệm thu |
| 4 | `loading="lazy" decoding="async"` | Không có |
| 5 | `src="menu-images/pho-bo.jpg"` — file thật, tên đúng món | `placeholder.com`, `picsum.photos`, hotlink CDN, ô xám base64 |
| 6 | Tên món thật: `Cà phê sữa đá`, `25000` | `Item 1`, `Lorem ipsum`, `Product Name`, `$9.99` |
| 7 | `<svg>` inline cho icon | Emoji làm icon: `🍜 🛒 ✅` |
| 8 | `<button>` cho mọi thứ bấm được, có `aria-label` nếu chỉ có icon | `<div onclick=…>`, nút icon không nhãn |
| 9 | Có cả 4 state — grep ra `skeleton`, `empty`, `error`, `Thử lại` | Chỉ có happy path |
| 10 | Chuỗi tiếng Việt tự nhiên: `Gửi đơn`, `Hết món` | `Add to cart`, `Submit`, `Out of stock` |

Thêm ba thứ nữa nếu còn thời gian: `border-radius` **không** quá 12px cho card (`9999px` trên card là sai); `box-shadow` không quá 3 mức, không có `0 25px 50px`; chữ xám **không** nhạt hơn `#78716C`.

---

## 10. Bài học từ lần dựng thật (2026-08-02)

Ba cái bẫy đã gặp, ghi lại để không mất thời gian lần nữa.

**1. "Tìm theo tên món" không đảm bảo ảnh đúng món.** Wikimedia Commons tra `"Nước mía"` trả về ảnh **bánh kem hồng**; `"Chè đậu xanh"` trả về **nồi đậu xanh sống**. Metadata khớp tên nhưng nội dung ảnh sai hoàn toàn. Openverse thì `title` phần lớn chỉ ghi `"Food"`, càng không tin được.
→ **Luôn dựng contact sheet rồi nhìn tận mắt.** Không có đường tắt. Script chỉ được phép *tải ứng viên*, không được phép *chọn*.

**2. Headless Chrome kẹp viewport ở 500px.** `--headless` cũ **bỏ qua** `--window-size` cho layout viewport (mặc định 500px), nên ảnh chụp "375px" thật ra là layout 500px bị cắt còn 375. Nhìn ảnh tưởng tràn ngang, suýt đi sửa một bug **không tồn tại**.
→ Đo `innerWidth`/`scrollWidth` bằng JS trước khi tin ảnh chụp. Dùng `--headless=new`; dưới 500px thì lồng trang vào `<iframe width="375">`.

**3. `| tail` nuốt exit code.** `pnpm build 2>&1 | tail -5 && echo "OK"` in ra `OK` **kể cả khi build fail**, vì `tail` mới là lệnh quyết định exit code.
→ Không nối `&& echo OK` sau pipe. Để lệnh chạy trần, hoặc dùng `set -o pipefail`.

# 12 — Chuyển prototype HTML sang React

Thư mục [`prototype/`](../prototype/) chứa **13 màn hình đã dựng và đã được người dùng duyệt**. Từ M2 trở đi, mọi task UI đều là *dựng lại đúng màn tương ứng bằng React*, không phải thiết kế lại.

> **Prototype là nguồn chân lý về LOOK và LUỒNG THAO TÁC. Không phải nguồn chân lý về kiến trúc.**
>
> Bố cục, khoảng cách, màu, cỡ chữ, thứ tự thao tác, chuỗi tiếng Việt → **copy nguyên**.
> Cách lấy dữ liệu, quản lý state, routing → làm theo `ai-docs/06`, **bỏ hết cách của prototype**.

Mở xem: `cd prototype && python3 -m http.server 8899` → <http://localhost:8899/index.html>

---

## 1. Bảng ánh xạ — file prototype ↔ route ↔ task

| File prototype | App | Route React | Task |
| --- | --- | --- | --- |
| `guest-menu.html` | guest | `/t/:qrToken` | `GU-02` `GU-03` `GU-04` |
| `guest-cart.html` | guest | `/t/:qrToken/cart` | `GU-05` `GU-06` |
| `guest-success.html` | guest | `/t/:qrToken/success` | `GU-07` |
| `guest-orders.html` | guest | `/t/:qrToken/orders` | `GU-08` `GU-09` |
| `guest-invalid.html` | guest | `/t/invalid` + màn phiên đóng + offline | `GU-10` |
| `staff-login.html` | staff | `/login` | `ST-01` |
| `staff-orders.html` | staff | `/orders` | `ST-03` `ST-04` `ST-05` `ST-08` |
| `staff-tables.html` | staff | `/tables` | `ST-06` |
| `staff-session.html` | staff | `/tables/:code` | `ST-07` |
| `admin-menu.html` | admin | `/menu` + modal form món | `AD-02` `AD-03` `AD-04` |
| `admin-tables.html` | admin | `/tables` + modal QR | `AD-05` `AD-06` |
| `admin-print.html` | admin | `/tables/print` | `AD-07` |
| `admin-settings.html` | admin | `/settings` | `AD-08` |
| `index.html` | — | — | Chỉ để điều hướng prototype. **Không port.** |

---

## 2. Quy trình chuyển một màn

1. **Mở màn prototype trong trình duyệt**, bấm thử hết các tương tác. Đừng chỉ đọc code.
2. **Đọc HTML/CSS của đúng file đó.** Copy giá trị spacing/màu/cỡ chữ, không tự ước lượng lại.
3. Tách CSS theo §4 dưới đây.
4. Dựng component. Dữ liệu lấy qua `src/lib/api/*` + TanStack Query — **không** import `_data.js`.
5. Đối chiếu: mở prototype và app React cạnh nhau ở cùng khổ 375 (hoặc 1024 với staff). Khác chỗ nào thì sửa React cho khớp.
6. Bù các chỗ prototype làm tắt — bảng §5.

---

## 3. KHÔNG được port sang React

Prototype có những thứ tồn tại **chỉ để xem được nhanh**. Bê nguyên sang React là sai.

| Thứ trong prototype | Vì sao có | React phải làm gì |
| --- | --- | --- |
| `protobar()` — thanh đen điều hướng trên đầu | Nhảy giữa 13 file HTML | **Xoá.** React dùng `react-router-dom`. |
| `_state-bar.js` — nút Loading/Rỗng/Lỗi | Xem 4 trạng thái không cần backend | **Xoá.** 4 trạng thái do TanStack Query quyết định (`isPending` / `isError` / mảng rỗng / có dữ liệu). |
| `_data.js` — `CATS`, `IT`, `TABLES`, `ORDERS` | Dữ liệu cứng | **Xoá.** Type từ `@kimthanh-tableqr/contracts`, dữ liệu từ MSW theo `ai-docs/04`. |
| `_data.js` — `fmt()`, `deTone()`, `orderTotal()`, `sessionTotal()`, `addLine()` | Bản sao rút gọn | **Xoá.** Import `formatVnd`, `removeVietnameseTones`, `calcOrderTotal`, `calcSessionTotal`, `addToCart` từ `packages/contracts`. Đã có test, đừng viết lại. |
| `_qr.js` — `fakeQr()` | Vẽ hình *trông giống* QR để duyệt bản in | **Xoá.** Dùng `qrcode.react`. Xem cảnh báo §6. |
| `localStorage['tableqr-proto-cart']` | Giữ giỏ khi nhảy giữa các file HTML | Giỏ nằm trong React context + `sessionStorage` **theo `sessionId`** (`GU-05`). |
| `prompt()` sửa ghi chú ở `guest-cart.html` | Làm tắt cho nhanh | **Bắt buộc thay** bằng bottom sheet hoặc ô nhập tại chỗ, kèm chip gợi ý như ở `guest-menu.html`. `prompt()` trên di động là trải nghiệm tệ. |
| **38 chỗ `onclick="..."` inline** | Viết nhanh | Handler React (`onClick={...}`). |
| `toast()` tự chế trong `_data.js` | — | Primitive `Toast` ở `packages/ui` (`WS-04`), có `role="status"`. |

Kiểm nhanh xem đã dọn sạch chưa:

```bash
grep -rn "protobar\|stateBar\|fakeQr\|_data\.js\|onclick=\|prompt(" tableqr-*/src
# Khong duoc ra ket qua nao.
```

---

## 4. CSS đi về đâu

`prototype/_shared.css` chia làm ba phần, ba đích khác nhau:

| Phần trong `_shared.css` | Đích | Ghi chú |
| --- | --- | --- |
| Khối `:root{ --brand-* --ink-* --st-* --s* --r-* --sh-* }` | `packages/ui/src/theme.css` dưới `@theme` của Tailwind v4 | **Copy nguyên giá trị.** Mọi hex đã đo tương phản — đổi là phải đo lại. Nguồn: `ai-docs/08`. |
| Primitive: `.btn*`, `.badge`, `.st-*`, `.input`, `.switch`, `.state`, `.sk`, `.toast`, `.scrim`, `.modal` | Component trong `packages/ui` | Đổi tên class thành prop/variant của component React. |
| Shell: `.guest`, `.g-hdr`, `.staff`, `.s-hdr`, `.admin`, `.a-side`, `.tbl` | `src/app/AppShell.tsx` của **từng app** | Mỗi app một shell riêng, không dùng chung. |
| `.protobar` | — | Xoá. |

CSS nằm trong `<style>` của từng file HTML là **style riêng của màn đó** → đi theo component của màn đó.

**Ba giá trị tuyệt đối không được đổi khi port** (đã sửa vì lỗi thật, không phải sở thích):

```css
.admin{ grid-template-columns:236px minmax(0,1fr) }  /* thieu minmax(0,·) -> CA TRANG tran ngang */
.panel{ overflow-x:auto } .tbl{ min-width:560px }    /* bang cuon TRONG panel, khong phai ca trang */
.num{ font-variant-numeric:tabular-nums }            /* moi so tien — khong co thi cot gia so le */
```

---

## 5. Chỗ prototype làm tắt — React phải làm đủ

Prototype dựng để **nhìn**, nên có chỗ chỉ làm phần vỏ. Không nhận ra là sẽ bê thiếu.

| Màn | Prototype chỉ có | React bắt buộc thêm | Task |
| --- | --- | --- | --- |
| `staff-orders` | Dữ liệu cứng, nút "Giả lập đơn mới" đẩy vào mảng | `useOrderStream()` polling `GET /staff/orders?since=` mỗi 3s, dùng `serverTime` của response làm `since` lần sau | `ST-02` |
| `staff-orders` | Chuông chỉ là icon bật/tắt | Âm báo thật bằng Web Audio, lưu `localStorage`, xử lý chặn autoplay | `ST-05` |
| `staff-orders` | Badge "2" cứng trên chuông gọi nhân viên | `GET /staff/calls?status=PENDING` chung chu kỳ polling | `ST-08` |
| `guest-menu` | Chip danh mục sáng theo `IntersectionObserver` — chạy đúng, giữ nguyên | Thêm debounce ô tìm kiếm | `GU-03` |
| `guest-cart` | `prompt()` sửa ghi chú | Sheet/inline editor + chip gợi ý | `GU-06` |
| `guest-cart` | `setTimeout` giả lập gửi đơn | `POST` thật + header `X-Request-Id` chống double-submit + xử lý `ITEMS_UNAVAILABLE` / `SESSION_CLOSED` | `GU-06` |
| `admin-menu` | Tay cầm `⠿` chỉ là ký tự, kéo không được | Kéo thả thật đổi `sortOrder`, lưu ngay | `AD-02` `AD-03` |
| `admin-menu` | Công tắc "Còn hàng" đổi state cục bộ | `PATCH /admin/items/:id` + cập nhật lạc quan + hoàn lại khi lỗi | `AD-03` |
| `admin-tables` `admin-print` | `fakeQr()` — **không quét được** | `qrcode.react` từ `qrUrl` thật | `AD-06` `AD-07` |
| `admin-settings` | Nút đổi logo chỉ hiện toast | Upload thật — hoãn tới `BE-09`, giai đoạn UI giữ ô nhập URL | `AD-08` |
| Mọi modal/sheet | Bẫy focus mới có ở bottom sheet `guest-menu` | **Mọi** modal/sheet đều phải bẫy focus, `Esc` đóng, trả focus về chỗ mở | `WS-04` |
| Mọi màn | Trạng thái đổi bằng nút dev | Do TanStack Query; **phải có đủ 4** | tất cả |

---

## 6. Cảnh báo mã QR

`prototype/_qr.js` vẽ hình **trông giống** mã QR: có 3 ô định vị và lưới module sinh theo token, nhưng **không mã hoá dữ liệu thật** — thiếu Reed-Solomon, thiếu version/mask hợp lệ. **Điện thoại không quét ra gì.**

Nó tồn tại chỉ để duyệt bố cục bản in (kích thước ô, cỡ chữ tên bàn, lề cắt). Trang `admin-print.html` đã đóng chữ chìm **"MÃ MINH HOẠ"** lên từng ô và có cảnh báo đỏ trên đầu.

**Không in trang prototype ra dán lên bàn.** Mã quét được sinh bằng `qrcode.react` ở `AD-06`; kiểm bằng **camera điện thoại thật**, không phải nhìn ảnh.

---

## 7. Kiểm đã port đúng chưa

Với mỗi màn, trước khi đánh `DONE`:

- [ ] Mở prototype và app React **cạnh nhau cùng khổ màn hình**, so từng vùng
- [ ] Chuỗi tiếng Việt giống **từng chữ** — copy chứ đừng gõ lại
- [ ] Không còn thứ nào trong bảng §3 (chạy lệnh `grep` ở trên)
- [ ] Đã bù hết các dòng của màn đó trong bảng §5
- [ ] `document.documentElement.scrollWidth === innerWidth` ở 375 / 768 / 1440
- [ ] Đủ 4 trạng thái, thử bằng chaos toggle của MSW (`WS-03`)
- [ ] Đối chiếu checklist đọc HTML 30 giây ở [11-ui-build-prompts.md §9](11-ui-build-prompts.md)

---

## 8. Bẫy đã gặp khi dựng prototype

Ghi lại để đừng vấp lại khi port.

- **Khai báo trùng `const` giữa file dùng chung và script trong trang** → `SyntaxError`, chết **cả** script, trang trắng trơn mà không có dấu hiệu gì. Ở React thì bundler bắt được, nhưng nhớ: trang trắng ≠ lỗi CSS.
- **`grid-template-columns: 236px 1fr` thiếu `minmax(0,·)`** → cột nội dung không co được dưới min-content của bảng, **cả trang** tràn ngang. Không nhìn ra bằng mắt ở màn rộng.
- **Ảnh chụp tự động dễ đánh lừa**: iframe chưa tải xong trông y hệt trang trắng. Nghi ngờ thì mở bằng mắt, đừng sửa theo ảnh.

# 08 — `tableqr-api` (M6–M7)

> # UNBLOCKED — 2026-08-02
>
> M5 automation gate đã đạt: workspace lint/test/build sạch, guest bundle 74,429 B gzip và production dist không có MSW. Camera QR, Print Preview và visual responsive được người dùng hoãn để test thủ công trước phát hành.
>
> Người dùng yêu cầu rõ: *"Gòy dựng UI trước. xong hết r mới bắt đầu làm BE."*
>
> Cụ thể, cho tới khi M5 xong: **không** tạo thư mục `tableqr-api/`, **không** viết Prisma schema, **không** thêm dependency backend nào vào workspace. Kể cả khi thấy "làm luôn cho tiện".
>
> Điều kiện mở khoá: xem cổng M5 → M6 ở [01-milestones.md](01-milestones.md).

File này viết sẵn để biết đích đến, giúp các quyết định ở M1–M5 không tự bắn vào chân mình.

---

## M6 — Dựng backend

### `BE-00` — Khởi tạo NestJS + Prisma + Postgres · DONE
`tableqr-api/` theo pattern `kimthanh-tutor/tutor-api`: NestJS 10, prefix `/api/v1`, `docker-compose.yml` (PostgreSQL 15 + api), `.env.example`, `GET /healthz` + `GET /readyz` (readyz kiểm tra DB). Hoàn thành 2026-08-09: Prisma generate/validate, lint, typecheck và build đều sạch; endpoint đã kiểm thử khi DB chưa sẵn sàng.

### `BE-01` — Prisma schema + migration · DONE
Dựng theo `ai-docs/03-domain-model.md`. Bảng `snake_case`. Bắt buộc:
- **Partial unique index** bảo đảm mỗi bàn tối đa một `TableSession` `OPEN`
- Unique `dining_table.code`, unique `dining_table.qr_token`
- Unique `(session_id, sequence_no)` trên `order`
- Tiền là `INTEGER`, **không** dùng float/decimal
- Index `order(created_at)` cho màn hình bếp

Hoàn thành 2026-08-09: schema/migration đã chạy thành công trên PostgreSQL 15 trong Docker; đã xác nhận partial unique index, unique `(session_id, sequence_no)`, index `order(created_at)` và `CHECK` cho quantity/sequence number.

### `BE-02` — Seed · DONE
Dùng lại đúng fixture của `packages/mock` để dữ liệu dev giống hệt giai đoạn UI. Hoàn thành 2026-08-09: seed idempotent đọc trực tiếp subpath fixture; database mới có 1 quán, 4 danh mục, 22 món, 8 bàn, session mẫu với 2 đơn/4 item.

### `BE-03` — Auth · DONE
PIN cho `staff`, email+mật khẩu cho `owner`. JWT, guard theo role. Mật khẩu/PIN băm bằng argon2 hoặc bcrypt — **không lưu thô**. Rate limit endpoint đăng nhập.

Hoàn thành 2026-08-09: bcrypt hash, JWT, `JwtAuthGuard`/`RolesGuard`, migration `auth_user`, rate limit 5 lần/phút cho login. Docker kiểm thử staff đúng → 200 và password sai → 401.

### `BE-04` — Guest module · DONE
4 endpoint `/guest/*`. Điểm cần cẩn thận:
- `GET /guest/tables/:qrToken` mở phiên: **transaction + xử lý đua** khi hai điện thoại quét cùng lúc — phải ra một session, không phải hai
- `POST .../orders`: snapshot `nameSnapshot` + `unitPriceVndSnapshot` **phía server**; không bao giờ tin giá client gửi lên
- Cấp `sequenceNo` trong transaction
- Idempotency theo `X-Request-Id`, cửa sổ 60s
- Rate limit theo `qrToken` — chặn spam đơn

Hoàn thành 2026-08-09: cả 4 endpoint Guest đã kiểm thử trên Docker; quét QR tạo/gắn đúng một session, order snapshot giá phía server, idempotency DB 60 giây trả 200 cùng order, call PENDING trùng trả 200. Rate limit theo QR/bàn trong cửa sổ 60 giây.

### `BE-05` — Staff module · DONE
9 endpoint `/staff/*`. Bảng chuyển trạng thái đơn thực thi **phía server**, không tin UI. `close` session = đặt `CLOSED` + `closedAt`, **không xoá đơn**.

Hoàn thành 2026-08-09: route staff được JWT/role guard bảo vệ; Docker test list order/table, chuyển đúng/sai (200/409), pay, close và resolve call đều thành công.

### `BE-06` — Admin module · DONE
CRUD danh mục / món / bàn / thông tin quán. Sinh `qrToken` bằng CSPRNG ≥ 16 ký tự. **Chặn mọi đường đổi `qrToken`.** Xoá món = soft delete. Chặn xoá bàn đang có session `OPEN`, chặn xoá danh mục còn món.

### `BE-07` — Xử lý lỗi thống nhất · DONE
Exception filter trả đúng shape `{ error: { code, message, details } }` với `message` **tiếng Việt** như đã ghi ở `ai-docs/04`.

Hoàn thành 2026-08-09: global exception filter đã được lint/typecheck và Docker kiểm tra cho lỗi 401 cùng lỗi server.

### `BE-08` — Logic tính tiền dùng chung · DONE
API import `calcOrderTotal` / `calcSessionTotal` từ `packages/contracts` — **không viết lại**. FE và BE không được phép cộng ra hai con số khác nhau.

Hoàn thành 2026-08-09: guest và staff cùng gọi helper import từ `packages/contracts`; Docker build/runtime đã kiểm tra được workspace dependency và endpoint thực tế.

### `BE-09` — Upload ảnh món · DONE
Nhận file, resize (sharp), lưu đĩa hoặc S3-compatible. Giới hạn dung lượng và MIME type. Thay ô nhập URL ở `AD-04`.

Hoàn thành 2026-08-09: lưu vào ổ đĩa cục bộ; owner tải JPG/PNG/WebP tối đa 5 MB, Sharp đổi sang WebP 480 × 270 và phục vụ qua `/uploads/` với cache 30 ngày. Form món thay URL bằng upload/preview/retry. Docker smoke test: JPEG 83 KB thành WebP 14,8 KB; MIME sai trả 400.

### `BE-10` — Script verify cURL · DONE
`tableqr-api/scripts/verify-flow-01-guest-order.sh` chạy hết luồng: mở phiên → gửi đơn (kèm idempotency) → gọi thêm → gọi nhân viên → bếp đổi trạng thái → thanh toán → reset bàn → quét lại thấy phiên sạch. Script dùng cURL + jq, tự dọn bàn fixture B01 trước khi chạy để chạy lặp lại được.

Hoàn thành 2026-08-09: kiểm đủ luồng guest/staff với API Docker, gồm tổng phiên, `SESSION_CLOSED` sau reset và phiên mới rỗng khi quét lại.

---

## M7 — Nối FE ↔ BE

### `BE-11` — SSE realtime · BLOCKED
`GET /staff/stream`. Event: `order.created`, `order.status_changed`, `call.created`, `session.closed`. Client thay implementation trong `useOrderStream()` — **không sửa component nào**. Fallback về polling nếu SSE lỗi 3 lần liên tiếp.

### `BE-12a` — **M7a**: nối lát cắt dọc — chỉ luồng khách · BLOCKED
Chỉ `tableqr-guest` đặt `VITE_USE_MOCK=false`. Staff và admin **vẫn chạy mock**.

Đi hết: quét QR → mở phiên → xem menu → gửi đơn → gọi thêm → xin tính tiền, trên API thật.

Đây là nơi mọi lệch contract lộ ra. Nối một app tại một thời điểm để biết chính xác lỗi ở đâu; nối cả ba cùng lúc thì ba app cùng hỏng.

> Nếu phải sửa component ở bước này thì tầng mock ở M1 đã làm sai contract. Sửa cho khớp `ai-docs/04`, **và ghi lại nguyên nhân** — cùng loại lỗi đó gần như chắc chắn còn nằm ở hai app kia.

### `BE-12b` — **M7b**: nối nốt staff + admin · BLOCKED
Sau khi `BE-12a` sạch. Xác nhận MSW **không** lọt vào production bundle của cả ba app.

### `BE-13` — Verify thiết bị thật · BLOCKED
In mã QR ra giấy, dán lên bàn. Điện thoại thật quét; tablet mở màn bếp. Đơn phải hiện trên bếp **< 2s, không refresh**. Thử với mạng 4G thật, không phải wifi.

# 11 — Vận hành billing (runbook hỗ trợ)

Tài liệu này dành cho người trực hỗ trợ khi có sự cố thanh toán. Chính sách nằm ở [10-saas-evolution.md](10-saas-evolution.md) §4; đây chỉ là cách xử lý.

Nguyên tắc bao trùm: **không sửa tay trong database.** Mọi can thiệp đi qua ops CLI để đúng một đường settle và luôn để lại audit (`subscription_event` có `actor` + `note`). Một dòng `UPDATE` gõ tay là một lần đối soát không ai truy lại được.

---

## 1. Ops CLI

CLI chạy **ngoài** tiến trình API đang phục vụ, bằng kết nối database của người vận hành. Role runtime `tableqr_app` bị RLS chặn mọi truy vấn chéo quán, nên CLI tự từ chối nếu bị chạy nhầm bằng role đó.

```bash
ops() {
  docker compose -f tableqr-api/docker-compose.yml run --rm --no-deps -T \
    -e DATABASE_URL='postgresql://tableqr:tableqr@db:5432/tableqr?schema=public' \
    api node dist/ops/billing-ops.cli.js "$@"
}
```

| Lệnh | Dùng khi |
| --- | --- |
| `ops attention` | Mở ca: quán đang GRACE/PAST_DUE/SUSPENDED, thanh toán chờ quá 24 giờ, webhook chưa xử lý xong |
| `ops find --query <email\|slug\|mã NV\|uuid>` | Có email chủ quán, cần ra `restaurantId` |
| `ops status --restaurant <query>` | Hồ sơ một quán: gói, kỳ, thanh toán, webhook, audit |
| `ops reconcile --payment-code <mã> --amount <vnd> --reference <mã GD> --operator <tên> [--note <text>]` | Tiền đã vào tài khoản nhưng webhook không tới |
| `ops replay --provider <tên> --event-id <id>` | Webhook đã lưu nhưng xử lý dở |
| `ops suspend --restaurant <query> --operator <tên> --reason <lý do>` | Tạm ngưng theo quyết định hỗ trợ |
| `ops unsuspend --restaurant <query> --operator <tên> --reason <lý do>` | Mở lại quán đã tạm ngưng |

Thêm `--json` khi cần cho script đọc. `--operator` ghi thẳng vào audit: dùng định danh người thật (`ho-tro:mai`), không dùng `admin`.

---

## 2. Chủ quán báo "đã chuyển khoản mà quán vẫn đóng"

```bash
ops status --restaurant chuquan@example.com
```

Đọc theo thứ tự và dừng ở nhánh khớp:

| Thấy gì | Nghĩa là | Làm gì |
| --- | --- | --- |
| Webhook gần nhất **CHƯA XỬ LÝ** | Tiến trình chết giữa chừng sau khi ghi audit | `ops replay --provider sepay --event-id <id>` |
| Không có webhook nào quanh giờ chuyển khoản | Provider không gọi tới, hoặc khách chuyển sai nội dung | Sang §3 |
| Thanh toán `SUCCEEDED`, cycle `PAID`, nhưng trạng thái vẫn `SUSPENDED` | Đúng chính sách: tiền vào **không** tự mở lại quán bị tạm ngưng | Xác minh rồi `ops unsuspend` |
| Thanh toán `SUCCEEDED`, cycle `PAID`, kỳ bắt đầu ở tương lai | Trả trước, chưa tới kỳ | Không làm gì; quán tự `ACTIVE` khi kỳ bắt đầu |
| Chủ quán đã yêu cầu ngừng gia hạn | Nút thanh toán bị khoá có chủ đích | Hướng dẫn bấm **Bật lại dịch vụ** ở `/billing` |

`ops replay` an toàn để chạy lại: sự kiện đã xử lý xong trả `duplicate` và không đổi gì.

---

## 3. Đối soát thủ công

Chỉ làm khi **đã tự mình nhìn thấy tiền trong sao kê ngân hàng**. CLI không kiểm tra hộ điều đó.

```bash
ops reconcile --payment-code TQR0123456789 --amount 100000 \
  --reference FT26082012345 --operator ho-tro:mai --note 'khach chuyen sai noi dung'
```

- `--reference` là mã giao dịch ngân hàng. Chạy lại cùng mã là no-op — chống ghi nhận hai lần khi hai người cùng xử lý một ca.
- Sai số tiền → `amount_mismatch`, không đổi gì. Tiền vào thiếu/thừa phải xử lý với chủ quán trước, không ép cho khớp.
- Thành công thì ghi `MANUAL_RECONCILED` kèm người thao tác và mã giao dịch.

Đối soát thủ công đi đúng đường settle của webhook: cùng kiểm tra idempotency, cùng cập nhật `Payment`/`SubscriptionCycle`, cùng quy tắc `SUSPENDED` không tự mở.

---

## 4. Hoàn tiền

Không tự động và không prorate (`SA-01`). Hoàn tiền thực hiện ở phía ngân hàng/provider; trong hệ thống ghi lại bằng `--note` khi `ops suspend` hoặc khi đối soát kỳ liên quan. Không sửa `Payment` đã `SUCCEEDED` thành trạng thái khác.

---

## 5. Chủ quán tự ngừng gia hạn

Owner bấm **Ngừng gia hạn** ở `/billing`:

- Kỳ đang chạy **không** bị cắt ngắn và **không** hoàn tiền.
- `POST /admin/billing/payment-intents` trả `409 SUBSCRIPTION_CANCELED` cho tới khi bật lại — để không ai trả tiền cho kỳ mình vừa từ chối.
- Lifecycle không đổi: hết kỳ vẫn vào `GRACE` 7 ngày rồi `PAST_DUE`.
- Banner admin đổi sang thông báo ngày dừng thay vì nhắc thanh toán.

Bật lại: **Bật lại dịch vụ** ở `/billing`, hoặc chủ quán làm được ngay cả khi đã `PAST_DUE` (`admin-account-write` luôn mở).

---

## 6. Tạm ngưng và mở lại

`ops suspend` dùng khi có quyết định của hỗ trợ (nghi ngờ gian lận, tranh chấp). Sau đó:

- Guest không gửi đơn, staff không thao tác, owner chỉ đọc và thanh toán.
- Tiền vào vẫn được ghi nhận nhưng **không** tự mở lại — đây là điểm khác duy nhất so với `PAST_DUE`.

`ops unsuspend` trả quán về `GRACE` 7 ngày để chủ quán kịp thanh toán. Nếu đã có kỳ trả trước phủ hiện tại thì `EntitlementService` nâng lên `ACTIVE` ngay ở lần tính trạng thái kế tiếp — CLI in ra trạng thái cuối cùng.

---

## 7. Backup và restore

```bash
bash tableqr-api/scripts/verify-billing-backup-restore.sh
```

Script dump toàn bộ database, restore vào một database diễn tập riêng trong cùng cluster, rồi so **số hàng và checksum nội dung** của `plan`, `subscription`, `subscription_cycle`, `subscription_event`, `payment`, `payment_webhook_event`; đồng thời kiểm tra unique chống replay webhook và RLS còn nguyên sau restore. Database diễn tập bị xoá khi script kết thúc.

Chạy trước mỗi lần release và sau mỗi lần đổi schema billing. Chưa có backup tự động/offsite — đó là `SA-02`.

---

## 8. Test tải nhiều quán

```bash
bash tableqr-api/scripts/load-test-tenants.sh              # 20 khách × 2 vòng
USERS=48 ITERATIONS=4 bash tableqr-api/scripts/load-test-tenants.sh
```

Đọc trên hai quán fixture, ghi trên một quán tạm đăng ký riêng cho lần chạy. Mỗi khách ảo ngồi một bàn riêng vì rate limit của guest tính theo QR/bàn. Script fail khi có lỗi 5xx hoặc khi dữ liệu của quán này lọt sang quán kia; 429 được đếm riêng vì đó là chặn có chủ đích.

Ngân sách p95 mặc định: bootstrap 400 ms, gửi đơn 800 ms, xem đơn 400 ms.

---

## 9. Giám sát và người chịu trách nhiệm

Chưa có hệ thống alert (`SA-02`). Bảng dưới chốt **ai xem cái gì**, để khi dựng alert thì chỉ việc nối nguồn.

| Tín hiệu | Nguồn hiện có | Ngưỡng | Người chịu trách nhiệm |
| --- | --- | --- | --- |
| API trả 5xx | Log `ApiException` (method, path, stack) trong log container | Bất kỳ 5xx nào | Trực kỹ thuật |
| Webhook xử lý dở | `ops attention` → mục webhook chưa xử lý | Còn tồn sau 15 phút | Trực kỹ thuật |
| Tiền chờ quá lâu | `ops attention` → thanh toán `PENDING` > 24 giờ | Bất kỳ dòng nào | Trực hỗ trợ |
| Quán sắp bị chặn | `ops attention` → GRACE còn < 2 ngày | Mỗi ngày một lần | Trực hỗ trợ |
| Quán `PAST_DUE` mới | `ops attention` → PAST_DUE | Mỗi ngày một lần | Trực hỗ trợ |
| Database không sẵn sàng | `GET /api/v1/readyz` | 2 lần lỗi liên tiếp | Trực kỹ thuật |
| Restore drill | §7 | Mỗi lần release | Trực kỹ thuật |

Chạy `ops attention` đầu mỗi ca là cách rẻ nhất để không bỏ sót cả bảng trên khi chưa có alert tự động.

---

## 10. Nghiệm thu

```bash
bash tableqr-api/scripts/verify-billing-operations.sh
```

Chạy hết chuỗi đăng ký → huỷ/bật lại → webhook sandbox → replay (đã xử lý và dở dang) → đối soát thủ công (sai số tiền, đúng số tiền, trùng mã) → tạm ngưng/mở lại → bảng theo dõi, và kiểm audit sau từng bước. Endpoint đăng ký giới hạn 3 lần/giờ; cần chạy lại nhiều lần thì `docker compose restart api`.

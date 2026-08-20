# 13 — SaaS: đa quán, đăng ký và thuê bao

Đây là roadmap mở rộng từ single-restaurant MVP sang SaaS đa quán. Theo quyết định người dùng ngày 2026-08-13, ưu tiên hoàn thiện code multi-tenant, onboarding và billing trên môi trường local trước. `SA-00`, `SA-02` và `BE-13` là cổng DevOps/phát hành làm ở cuối; không đưa quán thật vào vận hành trước khi ba cổng này đạt. `SA-01` vẫn phải được chốt trước các task billing vì nó quyết định state machine và quyền khi quá hạn.

Nguồn thiết kế: [../ai-docs/10-saas-evolution.md](../ai-docs/10-saas-evolution.md). Kiến trúc hiện tại: [../ai-docs/09-current-system-architecture.md](../ai-docs/09-current-system-architecture.md).

## Mốc

| Mốc | Mục tiêu | Task | Cổng đạt |
| --- | --- | --- | --- |
| M8 | Tenant isolation + onboarding | `SA-03`…`SA-07` | Hai quán không thể đọc/ghi dữ liệu chéo; chủ quán tự đăng ký được trong local/test |
| M9 | Chính sách + lifecycle billing | `SA-01`, `SA-08` | Trial 2 tháng, snapshot giá/gói, state machine và entitlement được test |
| M10 | Payment + owner self-service | `SA-09`…`SA-12` | Webhook idempotent, UI billing, entitlement và vận hành sandbox đúng |
| M11 | Sẵn sàng nhiều gói | `SA-13` | Gói/feature data-driven; đổi giá không đổi lịch sử |
| Release | Production + kiểm thử thiết bị | `SA-00`, `SA-02`, `BE-13` | HTTPS QR thật, backup/restore, monitor/alert, asset bền và thiết bị 4G/tablet đạt |

## Thứ tự thực hiện

| Thứ tự | Task | Ghi chú |
| --- | --- | --- |
| 1 | `SA-03` + `SA-04` | **DONE 2026-08-15** — RLS, tenant isolation REST/PATCH/SSE, migration rehearsal và forward/rollback plan local đã đạt. |
| 2 | `SA-05` | **DONE 2026-08-15** — query/index audit, EXPLAIN regression và bất biến business data đã đạt. |
| 3 | `SA-06` → `SA-07` | **DONE 2026-08-15** — đăng ký/onboarding API, shell owner tenant-scoped, account/trial và đổi PIN staff đã kiểm local. |
| 4 | `SA-01` | Chốt policy billing trước khi tạo lifecycle. |
| 5 | `SA-08` | Plan/subscription/entitlement bằng code và test local. |
| 6 | `SA-09` → `SA-12` | **DONE 2026-08-20** — payment adapter, billing UI, enforcement, runbook/ops CLI, đối soát thủ công, backup drill và test tải tenant đã kiểm local. |
| 7 | `SA-13` | Feature entitlement data-driven. |
| 8 | `SA-00` → `SA-02` | Chọn provider, deploy HTTPS, managed DB/object storage, backup/observability. |
| 9 | `BE-13` | Kiểm thử phát hành bằng QR giấy, điện thoại 4G và tablet thật. |
| Sau này | `SA-14` | Chỉ khi mô hình một owner/một quán không còn phù hợp. |

Các mô tả bên dưới không được sắp theo thứ tự thực hiện; luôn dùng bảng trên và `09-active-work.md` để chọn task kế tiếp.

## Nội dung từng task

### `SA-00` — Production foundation · TODO (Release gate)

Chọn deployment và HTTPS cho domain đã chốt: `tableqr.vn` (admin), `staff.tableqr.vn` (staff), `guest.tableqr.vn` (guest/QR). Mỗi hostname reverse proxy `/api/v1`, `/uploads`, `/menu-images` về cùng API để giữ same-origin; đặt secrets qua environment manager; production `JWT_SECRET` bắt buộc khác dev.

**Xong khi:** QR HTTPS cố định `https://guest.tableqr.vn/t/<qrToken>`, không có `localhost` trong build production, health/ready checks hoạt động, upload không phụ thuộc ổ đĩa ephemeral.

### `SA-01` — Chốt chính sách billing · DONE 2026-08-15

Ghi quyết định cổng thanh toán, ngày kết thúc trial, grace period, retry/dunning, refund và khi quá hạn guest/staff/admin được làm gì. Đã chốt: một tài khoản owner chỉ quản lý một quán; mỗi chi nhánh là quán/tài khoản độc lập. Chốt copy tiếng Việt cho trial/hết hạn/thanh toán thất bại.

**Kết quả:** chốt payment provider adapter generic (provider theo quốc gia được thêm ở `SA-09`), webhook xác thực/chống replay; trial hai tháng lịch, grace 7 ngày và dunning ngày 1/3/7. Hết grace chuyển `PAST_DUE`, dừng guest/staff ghi nghiệp vụ; owner chỉ đọc, thanh toán và cập nhật account. Refund thủ công theo từng trường hợp, có audit và không có prorate mặc định. `SUSPENDED` chỉ mở lại bằng hỗ trợ. Matrix quyền/copy, state-transition và acceptance criteria đã cập nhật; `SA-08` sẽ hiện thực lifecycle/entitlement.

### `SA-02` — Database operations & observability · TODO (Release gate)

Managed PostgreSQL hoặc phương án tương đương: backup tự động, restore drill, retention, migration runner một lần, structured logs, metrics/alerts và error tracking. Thêm object storage cho upload menu.

**Xong khi:** restore thử thành công trong môi trường tách biệt; alert DB/API/backup lỗi; ảnh vẫn truy cập được sau redeploy.

### `SA-03` — Tenant schema additive migration · DONE 2026-08-15

Thêm `restaurant_id` nullable vào `AuthUser` và mọi dữ liệu nghiệp vụ qua migration additive. Backfill toàn bộ dữ liệu hiện có vào quán mặc định; không đổi endpoint công khai ở task này. Không thêm `Organization`, `Membership` hay bảng billing ở task này.

**Xong khi:** dữ liệu cũ còn nguyên, FK/index/composite unique đúng, migration rehearsal + rollback plan + test backfill pass.

**Kết quả:** migration `20260815000000_tenant_rls` đã backfill `guest_session_access.restaurant_id`, thêm composite FK về session và RLS cho 12 bảng. Docker migration, seed hai tenant, direct query bằng role `tableqr_app` không context (0 row) và full flow guest–staff đều pass.

### `SA-04` — Tenant context & authorization · DONE 2026-08-15

JWT của `AuthUser` phải xác định restaurant đang thao tác. Tạo repository/service scope bắt buộc `restaurantId`; guest resolve qua QR token global unique và dùng guest-session capability được xác minh (không dựa vào UUID `sessionId` khó đoán). Không cho client chọn tenant bằng body/query không được xác minh; thay JWT query string của SSE bằng ticket ngắn hạn nếu cần.

**Xong khi:** test hai tenant chứng minh không thể GET/PATCH/stream/SSE dữ liệu chéo; log/audit có tenant context.

**Kết quả:** API runtime dùng role `tableqr_app` không `BYPASSRLS`; Prisma đặt tenant context transaction-local. Script regression đã pass guest capability, GET/PATCH cross-tenant, event SSE chỉ tới đúng quán, và stream ticket không dùng được cho REST.

### `SA-05` — Chuyển business data sang tenant-scoped · DONE 2026-08-15

Dual-write/backfill/đổi query cho menu, bàn, session, order, call, idempotency và asset. Đổi uniqueness của mã bàn thành `(restaurant_id, code)`, giữ QR token global unique; thêm index bắt đầu bằng `restaurant_id` cho query nóng.

**Xong khi:** `EXPLAIN` không quét chéo tenant, QR cũ hoạt động, totals/snapshot/idempotency và unique OPEN session vẫn đúng.

**Kết quả:** migration `20260815000001_tenant_query_indexes` thêm index menu guest/admin và order theo status; query plan regression xác nhận tenant condition, không sequential scan và có đủ index nóng. QR cũ, idempotency/full flow, snapshot giá và unique OPEN session đều pass local.

### `SA-06` — Owner registration & onboarding · DONE 2026-08-15

Tạo public flow đăng ký email/mật khẩu, kích hoạt ngay (chưa xác minh email ở phiên bản đầu), rồi transaction tạo Restaurant + `AuthUser` role `OWNER` + `trialEndsAt` cố định 2 tháng. Một tài khoản chỉ tạo một quán; chi nhánh là quán/tài khoản độc lập. Cho phép tạo menu/bàn mẫu và in QR hostname production. Chưa tích hợp payment hay bảng subscription ở task này; rate-limit nghiêm ngặt endpoint đăng ký.

**Xong khi:** một người mới tự tạo quán trong môi trường test, nhận trial 2 tháng cố định và không thấy dữ liệu quán khác.

**Kết quả:** public registration 3 lần/giờ tạo `Restaurant` TRIAL, owner, staff PIN hash, 2 danh mục/3 món/4 bàn mẫu trong một transaction RLS. Trial dùng hai tháng lịch; email trùng trả `EMAIL_ALREADY_IN_USE`. Regression pass owner/staff login, dữ liệu mẫu, tenant isolation và full guest–staff flow.

### `SA-07` — SaaS admin shell · DONE 2026-08-15

Đổi admin auth/session để lấy `restaurantId` từ JWT, thêm màn account/onboarding cơ bản. Không có chọn quán; một tài khoản chỉ có một quán. Không thay đổi luồng QR của khách.

**Xong khi:** owner chỉ xem/quản trị restaurant được cấp quyền; staff PIN được gán đúng restaurant; loading/error/empty/a11y và build sạch.

**Kết quả:** admin login nhận restaurant summary từ JWT, shell không còn gắn cứng tên Kim Thành cho owner mới. Settings hiển thị account/onboarding, mã login nhân viên và trial/billing; đổi PIN kiểm 6 chữ số, hash bcrypt và chỉ update staff service account của tenant JWT. Contracts/mock/API/UI build sạch; Docker smoke test xác nhận Kim Thành đổi PIN không ảnh hưởng Hương Quê và PIN fixture đã được khôi phục.

### `SA-08` — Catalog gói & subscription lifecycle · DONE 2026-08-15

Tạo `Plan`, `Subscription`, `SubscriptionCycle`, enum lifecycle và `EntitlementService`. Seed gói `starter-monthly`: 100.000 VND/tháng, không giới hạn order; giá và feature snapshot vào subscription/cycle.

**Kết quả:** migration tạo `Plan`, `Subscription`, `SubscriptionCycle` với RLS tenant scope và seed `starter-monthly` 100.000 VND/tháng, `orders: unlimited`. Subscription snapshot giá/feature; owner registration và seed đều tạo subscription tenant-scoped. `EntitlementService` chuyển `TRIAL`/`ACTIVE` hết hạn sang grace 7 ngày rồi `PAST_DUE`; `SUSPENDED` bất biến. Logic transition có 4 unit test, contract/API/admin build sạch và migration + seed đã chạy local. Enforcement route thuộc `SA-11`; provider adapter thuộc `SA-09`.

### `SA-09` — Payment provider adapter · DONE

Đã định nghĩa interface server-side generic cho provider: tạo payment instruction, verify webhook signature, unique event/provider transaction, retry an toàn, audit payload tối thiểu. Provider đầu tiên Việt Nam là SePay: HMAC-SHA256 ký `{timestamp}.{raw_body}`, owner tạo intent server-side, và webhook chỉ tra payment bằng payment code trước khi chuyển sang tenant transaction. Không nhận hoặc lưu dữ liệu thẻ.

**Đã kiểm:** SePay Test mode xác thực endpoint HMAC thật 200; Docker E2E tạo intent, settle `Payment`/`SubscriptionCycle`, replay duplicate và amount mismatch audit mà không đổi state. Cycle trả trước chỉ kích hoạt `ACTIVE` khi period bắt đầu để không cắt trial/kỳ đang chạy.

### `SA-10` — Billing UI & owner self-service · DONE

Admin `/billing` hiển thị gói active, trial/kỳ còn lại, tối đa 12 cycle, nút tạo hướng dẫn chuyển khoản và trạng thái thành công/lỗi rõ ràng. Giá gói và mọi số tiền hiển thị qua `formatVnd` (quy tắc vàng #4) → `100.000 ₫ / tháng`, không giới hạn đơn; chỉ hiển thị gói đang active. `GET /admin/billing` tenant-scoped, chỉ trả đúng field trong `BillingSummaryResponse`, không trả secret provider; UI mock/API thật đều dùng contract chung.

**Xong khi:** owner hoàn thành luồng trial → pay → active và hiểu lỗi thanh toán không cần hỗ trợ thủ công.

### `SA-11` — Entitlement enforcement · DONE 2026-08-17

Gắn `EntitlementService` vào endpoint/stream cần bảo vệ, dunning/grace theo `SA-01`, copy khác nhau cho owner/staff/guest. Duy trì đường vào billing/read-only cần thiết khi quá hạn.

**Xong khi:** matrix permission có integration test cho TRIAL, ACTIVE, GRACE, PAST_DUE, SUSPENDED; không có route ghi nghiệp vụ nào bỏ qua enforcement.

**Kết quả:** `EntitlementGuard` toàn cục mặc định từ chối — mọi route `POST`/`PATCH`/`PUT`/`DELETE` phải khai báo `@BillingAction`, nên không thể thêm route ghi lọt enforcement; quyết định quyền đọc từ `allowsBillingAction()` trong contracts. Guard resolve tenant bằng JWT (staff/admin) hoặc capability guest qua RLS. Đọc, đăng nhập/đăng ký, webhook và `POST /staff/stream-ticket` không bị chặn; owner quá hạn vẫn tạo được payment intent. Dunning ngày 1/3/7 ghi vào `SubscriptionEvent` với `occurredAt` suy ra từ `graceEndsAt` (không ghi trùng); `GET /admin/billing` trả `dunningNotices` và admin có banner grace/quá hạn ở mọi trang. `SUSPENDED` không còn tự kích hoạt lại khi có tiền vào. Copy guest/staff/owner lấy từ `restaurantInactiveMessage()`, staff/guest hiện đúng message của server thay vì chuỗi cứng.

**Đã kiểm:** 13 unit test billing trong contracts (58/58 workspace contracts) và `verify-entitlement-matrix.sh` chạy thật trên Docker — đủ 5 trạng thái, đúng copy từng đối tượng, audit dunning `1,3` trong grace, `SUSPENDED` + tiền vào vẫn `SUSPENDED`, `GRACE` + cycle đã trả thành `ACTIVE`. Regression `verify-flow-01-guest-order.sh`, `verify-tenant-isolation.sh`, `verify-sse-ticket.sh` vẫn pass; lint/build API + 3 app sạch.

### `SA-12` — Billing operations & acceptance · DONE 2026-08-20

Dashboard/support runbook cho payment fail, manual reconciliation có audit, webhook replay, cancel/reactivate và test tải tenant. Xác nhận backup/restore còn giữ subscription/payment audit.

**Xong khi:** checklist E2E từ đăng ký đến paid/past-due pass với provider sandbox; monitor/alert có owner rõ ràng.

**Kết quả:** runbook [`ai-docs/11-billing-operations.md`](../ai-docs/11-billing-operations.md) có đường xử lý theo triệu chứng, bảng giám sát và người chịu trách nhiệm từng tín hiệu. Ops CLI `dist/ops/billing-ops.cli.js` (`attention`/`find`/`status`/`reconcile`/`replay`/`suspend`/`unsuspend`) dùng lại `PaymentService`/`EntitlementService` nên không có nhánh settle thứ hai, chạy ngoài tiến trình API và tự từ chối khi bị chạy bằng role runtime `tableqr_app`. Đối soát thủ công là provider giả `manual` với `eventId = manual:<mã GD>` nên trùng mã là no-op, sai số tiền bị từ chối, thành công ghi `MANUAL_RECONCILED` kèm `actor` + `note`. Owner tự huỷ/bật lại gia hạn: `cancelAtPeriodEnd` chỉ khoá payment intent (`409 SUBSCRIPTION_CANCELED`) và đổi copy banner, không cắt kỳ đã trả, không đổi lifecycle.

Sửa hai lỗi thật do test tải phát hiện, đều làm khách nhận 500 khi hai điện thoại thao tác cùng lúc: mở phiên bàn bắt `P2002` trong transaction đã abort (thiếu `SAVEPOINT`) và cấp `sequence_no` bằng `MAX+1` chạy song song (thiếu khoá hàng phiên). Thêm một lỗ hổng vận hành: webhook đã ghi audit mà chưa `processedAt` từng bị coi là bản trùng, nghĩa là crash giữa chừng sẽ khoá quán vĩnh viễn dù tiền đã vào — nay được xử lý tiếp. Ngoài ra 5xx giờ có log kèm stack (trước đây filter nuốt hết, không thể đặt alert) và mọi 429 trả `RATE_LIMITED` với copy tiếng Việt thay vì chuỗi `ThrottlerException` tiếng Anh.

**Đã kiểm trên Docker:** `verify-billing-operations.sh` (8 nhóm, 40 assertion) PASS; `verify-billing-backup-restore.sh` PASS 6 bảng billing khớp cả số hàng lẫn checksum, unique chống replay và RLS còn nguyên; `load-test-tenants.sh` 20×2 PASS trong ngân sách p95, và 48×4 không có 5xx nào. Regression `verify-flow-01-guest-order.sh`, `verify-tenant-isolation.sh`, `verify-sse-ticket.sh`, `verify-entitlement-matrix.sh`, `verify-owner-registration.sh` đều PASS. Workspace `pnpm lint`/`test` (61 contracts + 17 mock)/`build` sạch.

**Còn mở:** throttle toàn cục 100 req/phút tính theo IP và API chưa `trust proxy` — sau reverse proxy production, cả hệ thống dùng chung một hạn mức. Ghi ở [`04-open-questions.md`](04-open-questions.md) Q13, cần chốt trước `SA-00`.

### `SA-13` — Feature entitlements data-driven · TODO

Đọc `feature_limits`/feature flags từ Plan qua entitlement, không hard-code kiểm tra theo `plan.code`. Gói starter vẫn unlimited orders.

**Xong khi:** thêm feature/gói test không cần thêm nhánh business logic rải rác; feature snapshot/version có test regression.

### `SA-14` — Multi-branch readiness · TODO (chỉ khi cần)

Chỉ làm khi mô hình một tài khoản/một quán không còn phù hợp. Khi đó, thêm cơ chế một tài khoản quản lý nhiều quán, switcher và policy billing chung mà không làm rò dữ liệu tenant.

**Xong khi:** cùng một owner quản lý hai quán mà dữ liệu/QR/menu/bàn vẫn cô lập; billing rule theo scope đã chọn được test.

## Definition of Done bổ sung cho mọi `SA-*`

- Migration có backup, restore rehearsal và rollback/forward plan rõ ràng.
- Có test tenant isolation tối thiểu hai quán và không leak qua REST/SSE/cache/log.
- Mọi số tiền là integer VND; số tiền lịch sử được snapshot.
- Webhook/payment idempotent, có audit; không log bí mật hoặc dữ liệu nhạy cảm.
- Domain QR production không đổi sau khi quán in mã.
- Cập nhật `ai-docs/03`, `04`, `09`, `10`, task/backlog/active work trong cùng lần đổi rule.

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
| 3 | `SA-06` → `SA-07` | `SA-06` **DONE 2026-08-15** — đăng ký chủ quán/onboarding API; tiếp theo hoàn thiện shell/onboarding admin. |
| 4 | `SA-01` | Chốt policy billing trước khi tạo lifecycle. |
| 5 | `SA-08` | Plan/subscription/entitlement bằng code và test local. |
| 6 | `SA-09` → `SA-12` | Payment provider, UI, enforcement và acceptance sandbox. |
| 7 | `SA-13` | Feature entitlement data-driven. |
| 8 | `SA-00` → `SA-02` | Chọn provider, deploy HTTPS, managed DB/object storage, backup/observability. |
| 9 | `BE-13` | Kiểm thử phát hành bằng QR giấy, điện thoại 4G và tablet thật. |
| Sau này | `SA-14` | Chỉ khi mô hình một owner/một quán không còn phù hợp. |

Các mô tả bên dưới không được sắp theo thứ tự thực hiện; luôn dùng bảng trên và `09-active-work.md` để chọn task kế tiếp.

## Nội dung từng task

### `SA-00` — Production foundation · TODO (Release gate)

Chọn deployment và HTTPS cho domain đã chốt: `tableqr.vn` (admin), `staff.tableqr.vn` (staff), `guest.tableqr.vn` (guest/QR). Mỗi hostname reverse proxy `/api/v1`, `/uploads`, `/menu-images` về cùng API để giữ same-origin; đặt secrets qua environment manager; production `JWT_SECRET` bắt buộc khác dev.

**Xong khi:** QR HTTPS cố định `https://guest.tableqr.vn/t/<qrToken>`, không có `localhost` trong build production, health/ready checks hoạt động, upload không phụ thuộc ổ đĩa ephemeral.

### `SA-01` — Chốt chính sách billing · TODO · NEEDS DECISION

Ghi quyết định cổng thanh toán, ngày kết thúc trial, grace period, retry/dunning, refund và khi quá hạn guest/staff/admin được làm gì. Đã chốt: một tài khoản owner chỉ quản lý một quán; mỗi chi nhánh là quán/tài khoản độc lập. Chốt copy tiếng Việt cho trial/hết hạn/thanh toán thất bại.

**Xong khi:** cập nhật `ai-docs/10`, enum status, state-transition và acceptance criteria; không còn quy tắc billing mơ hồ trong code task.

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

### `SA-07` — SaaS admin shell · TODO

Đổi admin auth/session để lấy `restaurantId` từ JWT, thêm màn account/onboarding cơ bản. Không có chọn quán; một tài khoản chỉ có một quán. Không thay đổi luồng QR của khách.

**Xong khi:** owner chỉ xem/quản trị restaurant được cấp quyền; staff PIN được gán đúng restaurant; loading/error/empty/a11y và build sạch.

### `SA-08` — Catalog gói & subscription lifecycle · TODO

Tạo `Plan`, `Subscription`, `SubscriptionCycle`, enum lifecycle và `EntitlementService`. Seed gói `starter-monthly`: 100.000 VND/tháng, không giới hạn order; giá và feature snapshot vào subscription/cycle.

**Xong khi:** trial → active → past due/suspended theo state machine; đổi giá plan không đổi cycle/subscription lịch sử; unit test state transitions.

### `SA-09` — Payment provider adapter · TODO · NEEDS DECISION

Implement adapter server-side cho provider đã chọn: tạo payment intent/link, verify webhook signature, unique event/provider transaction, retry an toàn, audit payload tối thiểu. Không nhận hoặc lưu dữ liệu thẻ.

**Xong khi:** sandbox chạy đủ paid/failed/duplicate webhook/out-of-order webhook; chỉ webhook hợp lệ cập nhật subscription.

### `SA-10` — Billing UI & owner self-service · TODO

Màn gói hiện tại, trial còn lại, hoá đơn/cycle, nút thanh toán và trạng thái rõ ràng. Copy phải nói 100.000 VND/tháng, không giới hạn đơn; chỉ hiển thị gói đang active.

**Xong khi:** owner hoàn thành luồng trial → pay → active và hiểu lỗi thanh toán không cần hỗ trợ thủ công.

### `SA-11` — Entitlement enforcement · TODO

Gắn `EntitlementService` vào endpoint/stream cần bảo vệ, dunning/grace theo `SA-01`, copy khác nhau cho owner/staff/guest. Duy trì đường vào billing/read-only cần thiết khi quá hạn.

**Xong khi:** matrix permission có integration test cho TRIAL, ACTIVE, GRACE, PAST_DUE, SUSPENDED; không có route ghi nghiệp vụ nào bỏ qua enforcement.

### `SA-12` — Billing operations & acceptance · TODO

Dashboard/support runbook cho payment fail, manual reconciliation có audit, webhook replay, cancel/reactivate và test tải tenant. Xác nhận backup/restore còn giữ subscription/payment audit.

**Xong khi:** checklist E2E từ đăng ký đến paid/past-due pass với provider sandbox; monitor/alert có owner rõ ràng.

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

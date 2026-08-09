# 13 — SaaS: đa quán, đăng ký và thuê bao

Thực hiện **sau `BE-13`**. Đây là roadmap mở rộng từ single-restaurant MVP sang SaaS đa quán; không được triển khai task dưới đây khi chưa có production foundation và các quyết định ở `SA-01`.

Nguồn thiết kế: [../ai-docs/10-saas-evolution.md](../ai-docs/10-saas-evolution.md). Kiến trúc hiện tại: [../ai-docs/09-current-system-architecture.md](../ai-docs/09-current-system-architecture.md).

## Mốc

| Mốc | Mục tiêu | Task | Cổng đạt |
| --- | --- | --- | --- |
| M8 | Đưa MVP lên production an toàn | `SA-00`…`SA-02` | HTTPS QR ổn định, backup restore đã thử, monitor/alert cơ bản |
| M9 | Tenant isolation + onboarding | `SA-03`…`SA-07` | Hai quán không thể đọc/ghi dữ liệu chéo; chủ quán tự đăng ký được |
| M10 | Trial và thu phí monthly | `SA-08`…`SA-12` | Trial 2 tháng, 100.000 VND/tháng, webhook idempotent, entitlement đúng |
| M11 | Sẵn sàng nhiều gói | `SA-13`…`SA-14` | Gói/feature data-driven; đổi giá không đổi lịch sử |

## Task theo thứ tự

### `SA-00` — Production foundation · TODO

Chọn deployment, domain/subdomain cho QR và HTTPS. Tách static frontend/API bằng reverse proxy hoặc cùng origin rõ ràng; đặt secrets qua environment manager; production `JWT_SECRET` bắt buộc khác dev.

**Xong khi:** URL QR HTTPS ổn định, không có `localhost` trong build production, health/ready checks hoạt động, upload không phụ thuộc ổ đĩa ephemeral.

### `SA-01` — Chốt chính sách billing · TODO · NEEDS DECISION

Ghi quyết định cổng thanh toán, ngày kết thúc trial, grace period, retry/dunning, refund, khi quá hạn guest/staff/admin được làm gì, và một owner có mấy quán/chi nhánh. Chốt copy tiếng Việt cho trial/hết hạn/thanh toán thất bại.

**Xong khi:** cập nhật `ai-docs/10`, enum status, state-transition và acceptance criteria; không còn quy tắc billing mơ hồ trong code task.

### `SA-02` — Database operations & observability · TODO

Managed PostgreSQL hoặc phương án tương đương: backup tự động, restore drill, retention, migration runner một lần, structured logs, metrics/alerts và error tracking. Thêm object storage cho upload menu.

**Xong khi:** restore thử thành công trong môi trường tách biệt; alert DB/API/backup lỗi; ảnh vẫn truy cập được sau redeploy.

### `SA-03` — Tenant schema additive migration · TODO

Thêm `Organization`, `Membership`, cột tenant nullable và các bảng billing qua migration additive. Backfill single restaurant hiện có thành default organization/owner membership; không đổi endpoint công khai ở task này.

**Xong khi:** dữ liệu cũ còn nguyên, FK/index/composite unique đúng, migration rehearsal + rollback plan + test backfill pass.

### `SA-04` — Tenant context & authorization · TODO

JWT/membership phải xác định organization/restaurant đang thao tác. Tạo repository/service scope bắt buộc `restaurantId`; guest resolve qua QR token global unique và dùng guest-session capability được xác minh (không dựa vào UUID `sessionId` khó đoán). Không cho client chọn tenant bằng body/query không được xác minh; thay JWT query string của SSE bằng ticket ngắn hạn nếu cần.

**Xong khi:** test hai tenant chứng minh không thể GET/PATCH/stream/SSE dữ liệu chéo; log/audit có tenant context.

### `SA-05` — Chuyển business data sang tenant-scoped · TODO

Dual-write/backfill/đổi query cho menu, bàn, session, order, call, idempotency và asset. Đổi uniqueness của mã bàn thành `(restaurant_id, code)`, giữ QR token global unique; thêm index bắt đầu bằng `restaurant_id` cho query nóng.

**Xong khi:** `EXPLAIN` không quét chéo tenant, QR cũ hoạt động, totals/snapshot/idempotency và unique OPEN session vẫn đúng.

### `SA-06` — Owner registration & onboarding · TODO

Tạo public flow đăng ký email/mật khẩu, xác minh email theo quyết định `SA-01`, rồi transaction tạo User + Organization + Restaurant + owner Membership + Subscription `TRIAL`. Cho phép tạo menu/bàn mẫu và in QR hostname production.

**Xong khi:** một người mới tự tạo quán trong môi trường test, nhận trial 2 tháng cố định và không thấy dữ liệu quán khác.

### `SA-07` — SaaS admin shell · TODO

Đổi admin auth/session cho membership, thêm chọn quán nếu policy cho phép nhiều quán, màn account/onboarding cơ bản. Không thay đổi luồng QR của khách.

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

### `SA-14` — Multi-branch readiness · TODO

Cho phép một organization có nhiều Restaurant khi business chốt. Thêm switcher và policy billing theo organization hoặc branch, không migrate lại dữ liệu tenant lần nữa.

**Xong khi:** cùng một owner quản lý hai restaurant cô lập dữ liệu/QR/menu/bàn; billing rule theo scope đã chọn được test.

## Definition of Done bổ sung cho mọi `SA-*`

- Migration có backup, restore rehearsal và rollback/forward plan rõ ràng.
- Có test tenant isolation tối thiểu hai quán và không leak qua REST/SSE/cache/log.
- Mọi số tiền là integer VND; số tiền lịch sử được snapshot.
- Webhook/payment idempotent, có audit; không log bí mật hoặc dữ liệu nhạy cảm.
- Domain QR production không đổi sau khi quán in mã.
- Cập nhật `ai-docs/03`, `04`, `09`, `10`, task/backlog/active work trong cùng lần đổi rule.

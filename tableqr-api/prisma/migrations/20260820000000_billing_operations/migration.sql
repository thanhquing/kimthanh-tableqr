-- Vận hành billing (`SA-12`): owner tự huỷ/bật lại gia hạn, và hỗ trợ đối soát
-- thủ công / tạm ngưng / mở lại đều để lại audit trong `subscription_event`.
-- Additive: cột mới có default, enum chỉ thêm nhãn.
-- Rollback: DROP COLUMN cancel_at_period_end, canceled_at ở `subscription` và
-- actor, note ở `subscription_event`.
-- (Nhãn enum thừa không ảnh hưởng bản cũ vì bản cũ không bao giờ ghi nhãn đó.)

ALTER TABLE "subscription"
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceled_at" TIMESTAMPTZ(3);

-- Audit hỗ trợ: ai can thiệp và vì lý do gì. Sự kiện lifecycle tự động để trống.
ALTER TABLE "subscription_event"
  ADD COLUMN "actor" TEXT,
  ADD COLUMN "note" TEXT;

-- PostgreSQL cho ADD VALUE trong transaction, nhưng nhãn mới chỉ dùng được ở
-- transaction sau — code chỉ ghi các nhãn này khi API đã chạy migration xong.
ALTER TYPE "SubscriptionEventType" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "SubscriptionEventType" ADD VALUE IF NOT EXISTS 'REACTIVATED';
ALTER TYPE "SubscriptionEventType" ADD VALUE IF NOT EXISTS 'MANUAL_RECONCILED';
ALTER TYPE "SubscriptionEventType" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "SubscriptionEventType" ADD VALUE IF NOT EXISTS 'UNSUSPENDED';

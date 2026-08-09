CREATE TABLE "guest_order_request" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_order_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guest_order_request_order_id_key" ON "guest_order_request"("order_id");
CREATE UNIQUE INDEX "guest_order_request_session_id_request_id_key" ON "guest_order_request"("session_id", "request_id");
CREATE INDEX "guest_order_request_created_at_idx" ON "guest_order_request"("created_at");

ALTER TABLE "guest_order_request" ADD CONSTRAINT "guest_order_request_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

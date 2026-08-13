CREATE TABLE "guest_session_access" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_session_access_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "guest_session_access_token_hash_key" ON "guest_session_access"("token_hash");
CREATE INDEX "guest_session_access_session_id_idx" ON "guest_session_access"("session_id");
ALTER TABLE "guest_session_access" ADD CONSTRAINT "guest_session_access_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

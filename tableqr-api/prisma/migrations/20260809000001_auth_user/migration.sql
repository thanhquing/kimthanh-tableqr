-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STAFF', 'OWNER');

-- CreateTable
CREATE TABLE "auth_user" (
    "id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT,
    "pin_hash" TEXT,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_user_credentials_match_role" CHECK (
      ("role" = 'STAFF' AND "email" IS NULL AND "pin_hash" IS NOT NULL AND "password_hash" IS NULL)
      OR ("role" = 'OWNER' AND "email" IS NOT NULL AND "pin_hash" IS NULL AND "password_hash" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");
CREATE INDEX "auth_user_role_is_active_idx" ON "auth_user"("role", "is_active");

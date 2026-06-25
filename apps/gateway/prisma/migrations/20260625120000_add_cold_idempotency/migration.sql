-- AlterTable
ALTER TABLE "wa_messages" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "isCold" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "wa_messages_sessionId_idempotencyKey_key" ON "wa_messages"("sessionId", "idempotencyKey");

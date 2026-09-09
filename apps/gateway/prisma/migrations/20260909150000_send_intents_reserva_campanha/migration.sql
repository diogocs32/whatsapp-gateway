-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "firstContact" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "campaign_recipients" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "wa_send_intents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "keyId" TEXT,
    "chatJid" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_send_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_send_intents_createdAt_idx" ON "wa_send_intents"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wa_send_intents_sessionId_idempotencyKey_key" ON "wa_send_intents"("sessionId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "wa_send_intents" ADD CONSTRAINT "wa_send_intents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

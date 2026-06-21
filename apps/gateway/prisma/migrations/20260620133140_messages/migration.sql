-- CreateTable
CREATE TABLE "wa_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "chatJid" TEXT NOT NULL,
    "senderJid" TEXT,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT,
    "status" TEXT,
    "raw" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_messages_sessionId_chatJid_timestamp_idx" ON "wa_messages"("sessionId", "chatJid", "timestamp");

-- CreateIndex
CREATE INDEX "wa_messages_sessionId_keyId_idx" ON "wa_messages"("sessionId", "keyId");

-- AddForeignKey
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

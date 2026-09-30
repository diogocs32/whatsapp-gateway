-- Aditiva/N-1: código anterior ignora a tabela. Sem alteração de wa_messages.
CREATE TABLE "wa_pending_message_acks" (
    "sessionId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wa_pending_message_acks_pkey" PRIMARY KEY ("sessionId", "keyId"),
    CONSTRAINT "wa_pending_message_acks_status_check" CHECK ("status" IN ('sent', 'delivered', 'read', 'error'))
);
CREATE INDEX "wa_pending_message_acks_lastSeenAt_idx" ON "wa_pending_message_acks"("lastSeenAt");
ALTER TABLE "wa_pending_message_acks" ADD CONSTRAINT "wa_pending_message_acks_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Caixa única de triagem (página Atendimento): só o estado AMARELO ("não preciso responder")
-- é persistido. Vermelho/verde são derivados de wa_messages (a última mensagem da conversa decide).
-- Aditiva e forward-only: nenhuma tabela/coluna existente é tocada.

-- CreateTable
CREATE TABLE "wa_conversation_triage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chatJid" TEXT NOT NULL,
    "markedKeyId" TEXT,
    "markedTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_conversation_triage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_conversation_triage_sessionId_chatJid_key" ON "wa_conversation_triage"("sessionId", "chatJid");

-- AddForeignKey
ALTER TABLE "wa_conversation_triage" ADD CONSTRAINT "wa_conversation_triage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- P-066 (etapa E22, Onda 8) — conversas fiéis ao WhatsApp Web.
-- Aditiva e forward-only: nenhuma coluna/tabela existente é alterada ou apagada.
-- (1) wa_messages ganha o selo "Encaminhada": ADD COLUMN com DEFAULT constante (false) e coluna
--     nula não reescrevem a tabela no PostgreSQL ≥ 11 (só metadado) — seguro em tabela grande.
-- (2) wa_message_reactions: uma linha por (sessão, mensagem-alvo, quem reagiu); reação removida
--     fica como lápide (emoji = ''). A reação deixa de ser gravada como mensagem `other`.

-- AlterTable
ALTER TABLE "wa_messages" ADD COLUMN     "forwardingScore" INTEGER,
ADD COLUMN     "isForwarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "wa_message_reactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chatJid" TEXT NOT NULL,
    "targetKeyId" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "senderJid" TEXT,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "emoji" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_message_reactions_sessionId_chatJid_timestamp_idx" ON "wa_message_reactions"("sessionId", "chatJid", "timestamp");

-- CreateIndex
CREATE INDEX "wa_message_reactions_createdAt_idx" ON "wa_message_reactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wa_message_reactions_sessionId_targetKeyId_senderKey_key" ON "wa_message_reactions"("sessionId", "targetKeyId", "senderKey");

-- AddForeignKey
ALTER TABLE "wa_message_reactions" ADD CONSTRAINT "wa_message_reactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

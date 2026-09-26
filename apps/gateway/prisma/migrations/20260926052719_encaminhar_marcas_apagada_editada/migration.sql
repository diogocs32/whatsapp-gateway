-- P-068 (etapa E24, Onda 8) — encaminhar mensagem fiel ao WhatsApp Web.
-- Aditiva e forward-only: duas colunas NULAS sem default em wa_messages (só metadado no
-- PostgreSQL ≥ 11 — não reescreve a tabela). `revokedAt` = apagada para todos, `editedAt` =
-- editada (Baileys `messages.update`); o encaminhar recusa as duas (a original guardada em `raw`
-- é a versão antiga). Nenhuma coluna/tabela existente é alterada.

-- AlterTable
ALTER TABLE "wa_messages" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3);

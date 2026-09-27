-- E26 · P-084 · D-038 — sugerir o proxy da sessão apagada ao recriar com o mesmo nome.
-- Aditiva e forward-only: duas colunas nullable + índice em session_proxy_assignments (tabela
-- pequena — uma linha por sessão que já teve proxy; o índice é criado na hora, sem CONCURRENTLY).
-- Código anterior ignora as colunas (N-1 compatível). SQL gerado por `prisma migrate diff`.

-- AlterTable
ALTER TABLE "session_proxy_assignments" ADD COLUMN     "releasedAt" TIMESTAMPTZ(3),
ADD COLUMN     "releasedSessionName" TEXT;

-- CreateIndex
CREATE INDEX "session_proxy_assignments_releasedSessionName_idx" ON "session_proxy_assignments"("releasedSessionName");

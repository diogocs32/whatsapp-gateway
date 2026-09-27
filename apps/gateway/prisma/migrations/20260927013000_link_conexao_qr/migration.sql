-- E27 · P-086/P-089 · D-037 — link público temporário para conectar sessão por QR.
-- Aditiva e forward-only: tabela nova (vazia) + coluna nullable em wa_sessions. Código anterior
-- ignora as duas (N-1 compatível). O backfill de "lastMeJid" copia o meJid das sessões conectadas
-- (tabela pequena, UPDATE único). SQL gerado por `prisma migrate diff` do schema anterior ao atual.

-- AlterTable
ALTER TABLE "wa_sessions" ADD COLUMN     "lastMeJid" TEXT;

-- Backfill
UPDATE "wa_sessions" SET "lastMeJid" = "meJid" WHERE "meJid" IS NOT NULL;

-- CreateTable
CREATE TABLE "wa_connect_links" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expectedPhone" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedReason" TEXT,
    "consumedAt" TIMESTAMPTZ(3),
    "newQrCount" INTEGER NOT NULL DEFAULT 0,
    "lastNewQrAt" TIMESTAMPTZ(3),
    "lastSeenAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wa_connect_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_connect_links_tokenHash_key" ON "wa_connect_links"("tokenHash");

-- CreateIndex
CREATE INDEX "wa_connect_links_sessionId_createdAt_idx" ON "wa_connect_links"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "wa_connect_links" ADD CONSTRAINT "wa_connect_links_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

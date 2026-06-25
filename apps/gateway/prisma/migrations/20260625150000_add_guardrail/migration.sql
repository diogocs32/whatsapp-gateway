-- CreateEnum
CREATE TYPE "GuardrailState" AS ENUM ('ativa', 'throttled', 'quarentena', 'aquecimento', 'banida', 'pausa_manual');

-- CreateTable
CREATE TABLE "session_guardrail" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "state" "GuardrailState" NOT NULL DEFAULT 'ativa',
    "reason" TEXT,
    "quarentenaDesde" TIMESTAMP(3),
    "cooldownAte" TIMESTAMP(3),
    "ultimoSinal" TEXT,
    "eventTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_guardrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_guardrail_sessionId_key" ON "session_guardrail"("sessionId");

-- AddForeignKey
ALTER TABLE "session_guardrail" ADD CONSTRAINT "session_guardrail_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

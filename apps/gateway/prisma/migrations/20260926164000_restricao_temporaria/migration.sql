-- P-048: prazo da restrição nativa do Baileys, independente do estado G5 (que pode ser manual).
-- O gate compara com o relógio em cada envio; prazo vencido libera sem job/restart.
ALTER TABLE "session_guardrail"
  ADD COLUMN "restrictionUntil" TIMESTAMP(3),
  ADD COLUMN "restrictionSignal" TEXT,
  ADD COLUMN "restrictionSource" TEXT,
  ADD COLUMN "restrictionType" TEXT;

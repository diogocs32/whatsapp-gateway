-- E14/P-057: jobs antigos (inclusive os que o código anterior repetia em PAUSED) deixam de
-- valer após start/resume. Default 0 preserva jobs já enfileirados de campanhas RUNNING.
ALTER TABLE "campaigns" ADD COLUMN "scheduleEpoch" INTEGER NOT NULL DEFAULT 0;

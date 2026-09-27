-- P-056: colunas aditivas; o código antigo ignora o lease. Deploy exige B-004/stop-first
-- na primeira transição N-1, pois uma réplica antiga não respeita o fencing.
ALTER TABLE "wa_sessions"
  ADD COLUMN "authEpoch" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseUntil" TIMESTAMPTZ(3);

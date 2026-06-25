-- CreateTable
CREATE TABLE "session_metrics" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "coldTotal" INTEGER NOT NULL DEFAULT 0,
    "coldMature" INTEGER NOT NULL DEFAULT 0,
    "responded" INTEGER NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sample" INTEGER NOT NULL DEFAULT 0,
    "reliable" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreSaude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_metrics_sessionId_windowDays_key" ON "session_metrics"("sessionId", "windowDays");

-- CreateIndex
CREATE INDEX "session_metrics_sessionId_computedAt_idx" ON "session_metrics"("sessionId", "computedAt");

-- AddForeignKey
ALTER TABLE "session_metrics" ADD CONSTRAINT "session_metrics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

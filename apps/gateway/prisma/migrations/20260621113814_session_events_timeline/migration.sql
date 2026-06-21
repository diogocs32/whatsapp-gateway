-- CreateTable
CREATE TABLE "wa_session_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'status',
    "status" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_session_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_session_events_sessionId_createdAt_idx" ON "wa_session_events"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "wa_session_events" ADD CONSTRAINT "wa_session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

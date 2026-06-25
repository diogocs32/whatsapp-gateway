-- CreateTable
CREATE TABLE "session_config" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "capBase" INTEGER NOT NULL DEFAULT 20,
    "warmupCurve" INTEGER[] DEFAULT ARRAY[5, 10, 20]::INTEGER[],
    "regiaoDdd" TEXT,
    "modo" TEXT NOT NULL DEFAULT 'cold_ok',
    "janelaInicio" INTEGER NOT NULL DEFAULT 8,
    "janelaFim" INTEGER NOT NULL DEFAULT 20,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "device" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_config_sessionId_key" ON "session_config"("sessionId");

-- AddForeignKey
ALTER TABLE "session_config" ADD CONSTRAINT "session_config_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "headers" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhooks_enabled_idx" ON "webhooks"("enabled");

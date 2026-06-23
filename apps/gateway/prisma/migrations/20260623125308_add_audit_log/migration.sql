-- CreateTable
CREATE TABLE "wa_audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_audit_logs_createdAt_idx" ON "wa_audit_logs"("createdAt");

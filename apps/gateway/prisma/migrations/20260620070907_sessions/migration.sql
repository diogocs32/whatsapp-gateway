-- CreateEnum
CREATE TYPE "Engine" AS ENUM ('BAILEYS', 'WWEBJS');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('STOPPED', 'STARTING', 'SCAN_QR_CODE', 'PAIRING_CODE', 'WORKING', 'FAILED', 'DEGRADED');

-- CreateTable
CREATE TABLE "wa_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" "Engine" NOT NULL DEFAULT 'BAILEYS',
    "status" "SessionStatus" NOT NULL DEFAULT 'STOPPED',
    "meJid" TEXT,
    "mePushName" TEXT,
    "phoneNumber" TEXT,
    "autostart" BOOLEAN NOT NULL DEFAULT true,
    "creds" JSONB,
    "metadata" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_auth_keys" (
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "wa_auth_keys_pkey" PRIMARY KEY ("sessionId","type","keyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_sessions_name_key" ON "wa_sessions"("name");

-- CreateIndex
CREATE INDEX "wa_auth_keys_sessionId_type_idx" ON "wa_auth_keys"("sessionId", "type");

-- AddForeignKey
ALTER TABLE "wa_auth_keys" ADD CONSTRAINT "wa_auth_keys_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

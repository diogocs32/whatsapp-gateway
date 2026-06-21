-- CreateEnum
CREATE TYPE "ProxyProtocol" AS ENUM ('HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5');

-- CreateEnum
CREATE TYPE "ProxySource" AS ENUM ('MANUAL', 'WEBSHARE');

-- CreateEnum
CREATE TYPE "ProxyStatus" AS ENUM ('UNTESTED', 'ALIVE', 'DEAD');

-- CreateEnum
CREATE TYPE "ProxyMode" AS ENUM ('NONE', 'SINGLE', 'RANGE', 'GLOBAL_ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "ProxyStrategy" AS ENUM ('STICKY', 'ROUND_ROBIN', 'LEAST_LATENCY', 'RANDOM');

-- CreateTable
CREATE TABLE "proxies" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT,
    "protocol" "ProxyProtocol" NOT NULL DEFAULT 'SOCKS5',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "source" "ProxySource" NOT NULL DEFAULT 'MANUAL',
    "webshareId" TEXT,
    "country" TEXT,
    "exitIp" TEXT,
    "latencyMs" INTEGER,
    "status" "ProxyStatus" NOT NULL DEFAULT 'UNTESTED',
    "lastTestedAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_proxy_assignments" (
    "sessionId" TEXT NOT NULL,
    "mode" "ProxyMode" NOT NULL DEFAULT 'NONE',
    "rangeStart" INTEGER,
    "rangeEnd" INTEGER,
    "strategy" "ProxyStrategy" NOT NULL DEFAULT 'STICKY',
    "currentProxyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_proxy_assignments_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "proxies_position_key" ON "proxies"("position");

-- CreateIndex
CREATE UNIQUE INDEX "proxies_webshareId_key" ON "proxies"("webshareId");

-- CreateIndex
CREATE INDEX "proxies_enabled_status_idx" ON "proxies"("enabled", "status");

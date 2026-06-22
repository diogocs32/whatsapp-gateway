-- CreateTable
CREATE TABLE "wa_licenses" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "token" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_licenses_pkey" PRIMARY KEY ("id")
);

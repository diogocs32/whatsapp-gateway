-- CreateTable
CREATE TABLE "wa_branding" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "productName" TEXT NOT NULL DEFAULT 'WhatsApp Gateway',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#10b981',
    "faviconUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_branding_pkey" PRIMARY KEY ("id")
);

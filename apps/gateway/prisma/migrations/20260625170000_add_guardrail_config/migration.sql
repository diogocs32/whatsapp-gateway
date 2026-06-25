-- CreateTable
CREATE TABLE "guardrail_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nmin" INTEGER,
    "throttleMult" DOUBLE PRECISION,
    "quarantineMult" DOUBLE PRECISION,
    "targetReplyRate" DOUBLE PRECISION,
    "cooldownHours" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardrail_config_pkey" PRIMARY KEY ("id")
);

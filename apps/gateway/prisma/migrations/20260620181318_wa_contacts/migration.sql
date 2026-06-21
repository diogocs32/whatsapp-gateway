-- CreateTable
CREATE TABLE "wa_contacts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "jid" TEXT,
    "lid" TEXT,
    "phone" TEXT,
    "pushName" TEXT,
    "name" TEXT,
    "verifiedName" TEXT,
    "imgUrl" TEXT,
    "status" TEXT,
    "source" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_contacts_sessionId_lid_idx" ON "wa_contacts"("sessionId", "lid");

-- CreateIndex
CREATE INDEX "wa_contacts_sessionId_jid_idx" ON "wa_contacts"("sessionId", "jid");

-- CreateIndex
CREATE UNIQUE INDEX "wa_contacts_sessionId_waId_key" ON "wa_contacts"("sessionId", "waId");

-- AddForeignKey
ALTER TABLE "wa_contacts" ADD CONSTRAINT "wa_contacts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

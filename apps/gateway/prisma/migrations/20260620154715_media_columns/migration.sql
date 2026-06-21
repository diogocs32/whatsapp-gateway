-- AlterTable
ALTER TABLE "wa_messages" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mediaKey" TEXT,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mimetype" TEXT;

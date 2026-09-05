CREATE TABLE "GameAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameAccount_pkey" PRIMARY KEY ("id")
);
INSERT INTO "GameAccount" ("id", "userId", "name", "updatedAt")
SELECT md5('default-game-account-' || "id"), "id", 'Основной аккаунт', CURRENT_TIMESTAMP FROM "User";
ALTER TABLE "Character" ADD COLUMN "gameAccountId" TEXT;
UPDATE "Character" c SET "gameAccountId" = ga."id" FROM "GameAccount" ga WHERE ga."userId" = c."userId";
ALTER TABLE "Character" ALTER COLUMN "gameAccountId" SET NOT NULL;
DROP INDEX "Character_userId_name_server_key";
CREATE UNIQUE INDEX "GameAccount_userId_name_key" ON "GameAccount"("userId", "name");
CREATE UNIQUE INDEX "Character_gameAccountId_name_server_key" ON "Character"("gameAccountId", "name", "server");
CREATE INDEX "Character_gameAccountId_idx" ON "Character"("gameAccountId");
ALTER TABLE "GameAccount" ADD CONSTRAINT "GameAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_gameAccountId_fkey" FOREIGN KEY ("gameAccountId") REFERENCES "GameAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

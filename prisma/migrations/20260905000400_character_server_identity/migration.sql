DROP INDEX "Character_userId_name_key";
CREATE UNIQUE INDEX "Character_userId_name_server_key" ON "Character"("userId", "name", "server");

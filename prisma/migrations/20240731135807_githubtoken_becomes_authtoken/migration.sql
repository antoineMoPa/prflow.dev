/*
  Warnings:

  - You are about to drop the `GithubToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GithubToken";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "AuthToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuthToken_name_idx" ON "AuthToken"("name");

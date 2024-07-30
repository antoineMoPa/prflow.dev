/*
  Warnings:

  - Added the required column `value` to the `GithubToken` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GithubToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "GithubToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GithubToken" ("id", "name", "teamId", "updatedAt") SELECT "id", "name", "teamId", "updatedAt" FROM "GithubToken";
DROP TABLE "GithubToken";
ALTER TABLE "new_GithubToken" RENAME TO "GithubToken";
CREATE INDEX "GithubToken_name_idx" ON "GithubToken"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

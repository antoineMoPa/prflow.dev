/*
  Warnings:

  - The primary key for the `RepoCache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `RepoCache` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepoCache" (
    "path" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cache" TEXT NOT NULL
);
INSERT INTO "new_RepoCache" ("cache", "createdAt", "path", "updatedAt") SELECT "cache", "createdAt", "path", "updatedAt" FROM "RepoCache";
DROP TABLE "RepoCache";
ALTER TABLE "new_RepoCache" RENAME TO "RepoCache";
CREATE INDEX "RepoCache_path_idx" ON "RepoCache"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

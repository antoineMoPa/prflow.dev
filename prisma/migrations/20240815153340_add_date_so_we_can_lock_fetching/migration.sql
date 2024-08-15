-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepoCache" (
    "path" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cache" TEXT NOT NULL,
    "lastFetchStarted" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_RepoCache" ("cache", "createdAt", "path", "updatedAt") SELECT "cache", "createdAt", "path", "updatedAt" FROM "RepoCache";
DROP TABLE "RepoCache";
ALTER TABLE "new_RepoCache" RENAME TO "RepoCache";
CREATE INDEX "RepoCache_path_idx" ON "RepoCache"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

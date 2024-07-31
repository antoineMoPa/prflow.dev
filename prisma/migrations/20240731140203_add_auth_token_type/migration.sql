-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuthToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'github',
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "AuthToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuthToken" ("id", "name", "teamId", "updatedAt", "value") SELECT "id", "name", "teamId", "updatedAt", "value" FROM "AuthToken";
DROP TABLE "AuthToken";
ALTER TABLE "new_AuthToken" RENAME TO "AuthToken";
CREATE INDEX "AuthToken_name_idx" ON "AuthToken"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

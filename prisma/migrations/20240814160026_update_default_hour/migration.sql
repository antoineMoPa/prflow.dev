-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSlackDate" TEXT NOT NULL,
    "slackDaysOfWeek" TEXT NOT NULL DEFAULT '1,3',
    "slackHour" INTEGER NOT NULL DEFAULT 15,
    "teamLeadId" TEXT NOT NULL,
    CONSTRAINT "Team_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "id", "lastSlackDate", "name", "slackDaysOfWeek", "slackHour", "teamLeadId", "updatedAt") SELECT "createdAt", "id", "lastSlackDate", "name", "slackDaysOfWeek", "slackHour", "teamLeadId", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE INDEX "Team_name_idx" ON "Team"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

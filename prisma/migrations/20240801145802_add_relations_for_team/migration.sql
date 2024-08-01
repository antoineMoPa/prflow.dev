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
    CONSTRAINT "AuthToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuthToken" ("id", "name", "teamId", "type", "updatedAt", "value") SELECT "id", "name", "teamId", "type", "updatedAt", "value" FROM "AuthToken";
DROP TABLE "AuthToken";
ALTER TABLE "new_AuthToken" RENAME TO "AuthToken";
CREATE INDEX "AuthToken_name_idx" ON "AuthToken"("name");
CREATE TABLE "new_GithubRepository" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "GithubRepository_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GithubRepository" ("createdAt", "id", "path", "teamId", "updatedAt") SELECT "createdAt", "id", "path", "teamId", "updatedAt" FROM "GithubRepository";
DROP TABLE "GithubRepository";
ALTER TABLE "new_GithubRepository" RENAME TO "GithubRepository";
CREATE INDEX "GithubRepository_path_idx" ON "GithubRepository"("path");
CREATE TABLE "new_TeamMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "githubUserName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeamMember" ("createdAt", "githubUserName", "id", "teamId", "updatedAt") SELECT "createdAt", "githubUserName", "id", "teamId", "updatedAt" FROM "TeamMember";
DROP TABLE "TeamMember";
ALTER TABLE "new_TeamMember" RENAME TO "TeamMember";
CREATE INDEX "TeamMember_githubUserName_idx" ON "TeamMember"("githubUserName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

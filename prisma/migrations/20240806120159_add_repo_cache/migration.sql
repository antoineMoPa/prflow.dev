-- CreateTable
CREATE TABLE "RepoCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cache" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "RepoCache_path_idx" ON "RepoCache"("path");

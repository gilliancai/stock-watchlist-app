-- CreateTable
CREATE TABLE "HistoryCache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "points" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

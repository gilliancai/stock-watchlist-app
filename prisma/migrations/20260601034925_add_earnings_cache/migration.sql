-- CreateTable
CREATE TABLE "EarningsCache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT,
    "estimate" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

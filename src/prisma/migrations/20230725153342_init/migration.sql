-- CreateTable
CREATE TABLE "Alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "isFinal" BOOLEAN NOT NULL,
    "isRedCandle" BOOLEAN NOT NULL,
    "isGreenCandle" BOOLEAN NOT NULL,
    "win" BOOLEAN NOT NULL
);

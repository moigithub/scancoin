/*
  Warnings:

  - You are about to drop the column `coinSymbol` on the `Alerts` table. All the data in the column will be lost.
  - Added the required column `symbol` to the `Alerts` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alerts" (
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
    "isRedCandleNext" BOOLEAN NOT NULL,
    "isGreenCandleNext" BOOLEAN NOT NULL,
    "win" BOOLEAN NOT NULL
);
INSERT INTO "new_Alerts" ("alertType", "close", "high", "id", "isFinal", "isGreenCandle", "isGreenCandleNext", "isRedCandle", "isRedCandleNext", "low", "open", "time", "volume", "win") SELECT "alertType", "close", "high", "id", "isFinal", "isGreenCandle", "isGreenCandleNext", "isRedCandle", "isRedCandleNext", "low", "open", "time", "volume", "win" FROM "Alerts";
DROP TABLE "Alerts";
ALTER TABLE "new_Alerts" RENAME TO "Alerts";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

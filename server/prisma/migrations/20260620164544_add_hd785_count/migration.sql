-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OpsParams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "downtimeDaysPerCriticalUnit" REAL NOT NULL,
    "productionValuePerUnitPerDayIdr" REAL NOT NULL,
    "dailyCoalTargetT" REAL NOT NULL,
    "hd785UnitCount" INTEGER NOT NULL DEFAULT 12
);
INSERT INTO "new_OpsParams" ("dailyCoalTargetT", "downtimeDaysPerCriticalUnit", "id", "productionValuePerUnitPerDayIdr") SELECT "dailyCoalTargetT", "downtimeDaysPerCriticalUnit", "id", "productionValuePerUnitPerDayIdr" FROM "OpsParams";
DROP TABLE "OpsParams";
ALTER TABLE "new_OpsParams" RENAME TO "OpsParams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

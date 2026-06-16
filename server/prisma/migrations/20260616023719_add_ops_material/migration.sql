-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "material" TEXT;

-- CreateTable
CREATE TABLE "OpsParams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "downtimeDaysPerCriticalUnit" REAL NOT NULL,
    "productionValuePerUnitPerDayIdr" REAL NOT NULL,
    "dailyCoalTargetT" REAL NOT NULL
);

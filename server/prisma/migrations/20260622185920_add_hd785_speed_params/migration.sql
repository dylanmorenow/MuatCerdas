-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpeedParams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tempCorrectionFactor" REAL NOT NULL,
    "siteCorrectionFactor" REAL NOT NULL,
    "loadShareHeaviestPosition" REAL NOT NULL,
    "distancePerShiftKm" REAL NOT NULL,
    "workHoursPerShift" REAL NOT NULL,
    "effectiveWorkHoursPerDay" REAL NOT NULL,
    "fixedTimeHours" REAL NOT NULL,
    "oneWayKm" REAL NOT NULL,
    "dailyTargetTon" REAL NOT NULL,
    "haulUnitCount" INTEGER NOT NULL DEFAULT 95,
    "haulPayloadCapacityTon" REAL NOT NULL DEFAULT 120,
    "hd785UnitCount" INTEGER NOT NULL DEFAULT 12,
    "hd785PayloadCapacityTon" REAL NOT NULL DEFAULT 91,
    "hd785DailyTargetTon" REAL NOT NULL DEFAULT 40000,
    "hd785EffectiveWorkHoursPerDay" REAL NOT NULL DEFAULT 20,
    "hd785FixedTimeHours" REAL NOT NULL DEFAULT 0.3,
    "hd785OneWayKm" REAL NOT NULL DEFAULT 3
);
INSERT INTO "new_SpeedParams" ("dailyTargetTon", "distancePerShiftKm", "effectiveWorkHoursPerDay", "fixedTimeHours", "haulPayloadCapacityTon", "haulUnitCount", "id", "loadShareHeaviestPosition", "oneWayKm", "siteCorrectionFactor", "tempCorrectionFactor", "workHoursPerShift") SELECT "dailyTargetTon", "distancePerShiftKm", "effectiveWorkHoursPerDay", "fixedTimeHours", "haulPayloadCapacityTon", "haulUnitCount", "id", "loadShareHeaviestPosition", "oneWayKm", "siteCorrectionFactor", "tempCorrectionFactor", "workHoursPerShift" FROM "SpeedParams";
DROP TABLE "SpeedParams";
ALTER TABLE "new_SpeedParams" RENAME TO "SpeedParams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

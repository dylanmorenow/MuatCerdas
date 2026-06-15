-- CreateTable
CREATE TABLE "SpeedParams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tempCorrectionFactor" REAL NOT NULL,
    "siteCorrectionFactor" REAL NOT NULL,
    "loadShareHeaviestPosition" REAL NOT NULL,
    "distancePerShiftKm" REAL NOT NULL,
    "workHoursPerShift" REAL NOT NULL,
    "effectiveWorkHoursPerDay" REAL NOT NULL,
    "fixedTimeHours" REAL NOT NULL,
    "oneWayKm" REAL NOT NULL,
    "dailyTargetTon" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "TkphCatalog" (
    "tireModel" TEXT NOT NULL PRIMARY KEY,
    "catalogTkph" REAL NOT NULL
);

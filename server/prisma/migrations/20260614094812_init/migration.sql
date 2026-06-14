-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tareKg" REAL NOT NULL,
    "ratedPayloadKg" REAL NOT NULL,
    "tiresCount" INTEGER NOT NULL,
    "tireModel" TEXT,
    "tirePriceIdr" REAL,
    "kmPerYear" REAL
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shift" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RoadSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "lengthKm" REAL NOT NULL,
    "conditionScore" REAL NOT NULL,
    "avgSpeedLoadedKmh" REAL NOT NULL,
    "avgSpeedEmptyKmh" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "TireRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "installDate" DATETIME NOT NULL,
    "removalDate" DATETIME,
    "kmAtRemoval" REAL,
    "avgPressureDeviationPct" REAL,
    "loadIndex" REAL,
    "removalReason" TEXT NOT NULL,
    "costIdr" REAL NOT NULL,
    CONSTRAINT "TireRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TripLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "km" REAL NOT NULL,
    "avgPressureDeviationPct" REAL,
    "payloadIdx" REAL,
    CONSTRAINT "TripLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TripLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TripSegmentExposure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripLogId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "km" REAL NOT NULL,
    CONSTRAINT "TripSegmentExposure_tripLogId_fkey" FOREIGN KEY ("tripLogId") REFERENCES "TripLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripSegmentExposure_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "RoadSegment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayloadEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "measuredPayloadKg" REAL NOT NULL,
    "targetPayloadKg" REAL NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "PayloadEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayloadEvent_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalibrationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "lastCalibrationDate" DATETIME NOT NULL,
    "scaleStudyOffsetPct" REAL NOT NULL,
    CONSTRAINT "CalibrationRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostParams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tirePriceIdr" REAL NOT NULL,
    "tiresPerUnit" REAL NOT NULL,
    "kmPerYear" REAL NOT NULL,
    "tireLifeActualKm" REAL NOT NULL,
    "tireLifeBestKm" REAL NOT NULL,
    "captureRate" REAL NOT NULL,
    "fleetSize" INTEGER NOT NULL,
    "capexIdr" REAL NOT NULL,
    "opexAnnualIdr" REAL NOT NULL,
    "fuelCostPerTripIdr" REAL NOT NULL,
    "tripsPerYear" REAL NOT NULL,
    "underloadPct" REAL NOT NULL,
    "overloadWearCostFactorIdr" REAL NOT NULL
);

-- CreateIndex
CREATE INDEX "TireRecord_unitId_idx" ON "TireRecord"("unitId");

-- CreateIndex
CREATE INDEX "TripLog_unitId_idx" ON "TripLog"("unitId");

-- CreateIndex
CREATE INDEX "TripLog_operatorId_idx" ON "TripLog"("operatorId");

-- CreateIndex
CREATE INDEX "TripSegmentExposure_tripLogId_idx" ON "TripSegmentExposure"("tripLogId");

-- CreateIndex
CREATE INDEX "TripSegmentExposure_segmentId_idx" ON "TripSegmentExposure"("segmentId");

-- CreateIndex
CREATE INDEX "PayloadEvent_unitId_idx" ON "PayloadEvent"("unitId");

-- CreateIndex
CREATE INDEX "PayloadEvent_operatorId_idx" ON "PayloadEvent"("operatorId");

-- CreateIndex
CREATE INDEX "CalibrationRecord_unitId_idx" ON "CalibrationRecord"("unitId");

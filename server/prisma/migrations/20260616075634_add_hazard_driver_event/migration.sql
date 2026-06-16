-- CreateTable
CREATE TABLE "RoadHazard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "positionKm" REAL NOT NULL,
    "severity" REAL NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'lidar_sim',
    CONSTRAINT "RoadHazard_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "RoadSegment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "atKm" REAL,
    "hazardType" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'sim',
    CONSTRAINT "DriverEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RoadHazard_segmentId_idx" ON "RoadHazard"("segmentId");

-- CreateIndex
CREATE INDEX "DriverEvent_unitId_idx" ON "DriverEvent"("unitId");

-- CreateIndex
CREATE INDEX "DriverEvent_timestamp_idx" ON "DriverEvent"("timestamp");

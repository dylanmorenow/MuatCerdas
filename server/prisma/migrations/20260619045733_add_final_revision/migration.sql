-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "zone" TEXT;

-- CreateTable
CREATE TABLE "ExcavatorOperator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "excavatorType" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ResolvedAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "detail" TEXT,
    "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ZoneCondition" (
    "zone" TEXT NOT NULL PRIMARY KEY,
    "condition" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoadHazard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "positionKm" REAL NOT NULL,
    "severity" REAL NOT NULL,
    "coveragePct" REAL NOT NULL DEFAULT 0,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'camera_ai',
    CONSTRAINT "RoadHazard_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "RoadSegment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RoadHazard" ("detectedAt", "id", "positionKm", "segmentId", "severity", "source", "type") SELECT "detectedAt", "id", "positionKm", "segmentId", "severity", "source", "type" FROM "RoadHazard";
DROP TABLE "RoadHazard";
ALTER TABLE "new_RoadHazard" RENAME TO "RoadHazard";
CREATE INDEX "RoadHazard_segmentId_idx" ON "RoadHazard"("segmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExcavatorOperator_name_key" ON "ExcavatorOperator"("name");

-- CreateIndex
CREATE INDEX "ResolvedAction_unitId_idx" ON "ResolvedAction"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ResolvedAction_actionType_refKey_key" ON "ResolvedAction"("actionType", "refKey");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoadSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "lengthKm" REAL NOT NULL,
    "conditionScore" REAL NOT NULL,
    "avgSpeedLoadedKmh" REAL NOT NULL,
    "avgSpeedEmptyKmh" REAL NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'haul'
);
INSERT INTO "new_RoadSegment" ("avgSpeedEmptyKmh", "avgSpeedLoadedKmh", "conditionScore", "id", "lengthKm", "name", "surface") SELECT "avgSpeedEmptyKmh", "avgSpeedLoadedKmh", "conditionScore", "id", "lengthKm", "name", "surface" FROM "RoadSegment";
DROP TABLE "RoadSegment";
ALTER TABLE "new_RoadSegment" RENAME TO "RoadSegment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

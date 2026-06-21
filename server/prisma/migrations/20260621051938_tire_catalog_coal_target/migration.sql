-- CreateTable
CREATE TABLE "CoalTarget" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "targetT" REAL NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TkphCatalog" (
    "tireModel" TEXT NOT NULL PRIMARY KEY,
    "catalogTkph" REAL NOT NULL,
    "idealLifeKm" REAL NOT NULL DEFAULT 100000,
    "sizeSpec" TEXT,
    "loadRating" TEXT
);
INSERT INTO "new_TkphCatalog" ("catalogTkph", "tireModel") SELECT "catalogTkph", "tireModel" FROM "TkphCatalog";
DROP TABLE "TkphCatalog";
ALTER TABLE "new_TkphCatalog" RENAME TO "TkphCatalog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

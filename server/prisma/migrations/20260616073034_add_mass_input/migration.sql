-- CreateTable
CREATE TABLE "MassInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "material" TEXT,
    "totalT" REAL NOT NULL,
    "bucket1T" REAL,
    "bucket2T" REAL,
    "excavatorOperator" TEXT,
    "operatorName" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'operator',
    CONSTRAINT "MassInput_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MassInput_unitId_idx" ON "MassInput"("unitId");

-- CreateIndex
CREATE INDEX "MassInput_timestamp_idx" ON "MassInput"("timestamp");

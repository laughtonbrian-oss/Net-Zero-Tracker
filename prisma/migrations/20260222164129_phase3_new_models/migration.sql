-- AlterTable
ALTER TABLE "Company" ADD COLUMN "logo" TEXT;

-- CreateTable
CREATE TABLE "ActualEmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "scope1" REAL NOT NULL DEFAULT 0,
    "scope2" REAL NOT NULL DEFAULT 0,
    "scope3" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActualEmission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrowthRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baselineId" TEXT NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "toYear" INTEGER NOT NULL,
    "ratePct" REAL NOT NULL,
    CONSTRAINT "GrowthRate_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "Baseline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyEmissionFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyEmissionFactor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnergyReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "energyType" TEXT NOT NULL,
    "kWh" REAL NOT NULL,
    "cost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnergyReading_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnergyReading_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActualEmission_companyId_year_key" ON "ActualEmission"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmissionFactor_companyId_region_fuelType_key" ON "CompanyEmissionFactor"("companyId", "region", "fuelType");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyReading_companyId_siteId_year_month_energyType_key" ON "EnergyReading"("companyId", "siteId", "year", "month", "energyType");

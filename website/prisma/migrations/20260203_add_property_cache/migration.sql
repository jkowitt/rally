-- CreateTable
CREATE TABLE "PropertyCache" (
    "id" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "propertyType" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "squareFeet" INTEGER,
    "yearBuilt" INTEGER,
    "lotSizeSqft" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lastSaleDate" TEXT,
    "lastSalePrice" DOUBLE PRECISION,
    "saleHistory" JSONB,
    "source" TEXT NOT NULL,
    "rawData" JSONB,
    "isComp" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCache_addressHash_key" ON "PropertyCache"("addressHash");

-- CreateIndex
CREATE INDEX "PropertyCache_city_state_idx" ON "PropertyCache"("city", "state");

-- CreateIndex
CREATE INDEX "PropertyCache_zipCode_idx" ON "PropertyCache"("zipCode");

-- CreateIndex
CREATE INDEX "PropertyCache_source_idx" ON "PropertyCache"("source");

-- CreateIndex
CREATE INDEX "PropertyCache_expiresAt_idx" ON "PropertyCache"("expiresAt");

-- CreateIndex
CREATE INDEX "PropertyCache_isComp_city_state_idx" ON "PropertyCache"("isComp", "city", "state");

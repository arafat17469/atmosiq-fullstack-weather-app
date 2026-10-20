-- CreateTable: Location
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WeatherRequest
CREATE TABLE "WeatherRequest" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WeatherObservation
CREATE TABLE "WeatherObservation" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "observationDate" DATE NOT NULL,
    "temperatureMin" DOUBLE PRECISION,
    "temperatureMax" DOUBLE PRECISION,
    "temperatureMean" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "weatherCode" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherObservation_pkey" PRIMARY KEY ("id")
);

-- Constraints and indexes
CREATE UNIQUE INDEX "Location_latitude_longitude_key" ON "Location"("latitude", "longitude");
CREATE INDEX "Location_name_idx" ON "Location"("name");

ALTER TABLE "WeatherRequest" ADD CONSTRAINT "WeatherRequest_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "WeatherRequest_locationId_idx" ON "WeatherRequest"("locationId");
CREATE INDEX "WeatherRequest_createdAt_idx" ON "WeatherRequest"("createdAt");

ALTER TABLE "WeatherObservation" ADD CONSTRAINT "WeatherObservation_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "WeatherRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WeatherObservation_requestId_observationDate_key"
    ON "WeatherObservation"("requestId", "observationDate");
CREATE INDEX "WeatherObservation_requestId_idx" ON "WeatherObservation"("requestId");

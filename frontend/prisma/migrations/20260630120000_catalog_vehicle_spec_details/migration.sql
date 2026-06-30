-- AlterTable: CatalogVariant - add doors and seats
ALTER TABLE "CatalogVariant" ADD COLUMN "doors" INTEGER;
ALTER TABLE "CatalogVariant" ADD COLUMN "seats" INTEGER;

-- AlterTable: CatalogEngine - add cylinders, valves, aspiration
ALTER TABLE "CatalogEngine" ADD COLUMN "cylinders" INTEGER;
ALTER TABLE "CatalogEngine" ADD COLUMN "valves" INTEGER;
ALTER TABLE "CatalogEngine" ADD COLUMN "aspiration" TEXT;

-- AlterTable: VehicleFactorySpec - add cylinders, doors, seats
ALTER TABLE "VehicleFactorySpec" ADD COLUMN "cylinders" INTEGER;
ALTER TABLE "VehicleFactorySpec" ADD COLUMN "doors" INTEGER;
ALTER TABLE "VehicleFactorySpec" ADD COLUMN "seats" INTEGER;

-- AlterTable: VehicleCurrentSpec - add cylinders, doors, seats
ALTER TABLE "VehicleCurrentSpec" ADD COLUMN "cylinders" INTEGER;
ALTER TABLE "VehicleCurrentSpec" ADD COLUMN "doors" INTEGER;
ALTER TABLE "VehicleCurrentSpec" ADD COLUMN "seats" INTEGER;

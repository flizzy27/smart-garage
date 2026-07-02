import type { BodyType, DriveType, FuelType } from "@prisma/client";

export type BundledEngineConfig = {
  variantName?: string;
  engineName?: string;
  years?: number[];
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string | null;
  displacementCc?: number | null;
  fuelType?: FuelType | null;
  powerKw?: number | null;
  powerPs?: number | null;
  torqueNm?: number | null;
  cylinders?: number | null;
  valves?: number | null;
  aspiration?: string | null;
  transmissionTypes?: string[] | null;
  bodyType?: BodyType | null;
  driveType?: DriveType | null;
  doors?: number | null;
  seats?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type BundledModel = {
  name: string;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];
  configs?: BundledEngineConfig[];
};

export type BundledManufacturer = {
  slug: string;
  name: string;
  country: string;
  models: BundledModel[];
};

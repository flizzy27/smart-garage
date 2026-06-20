export type ManufacturerSeedModel = {
  name: string;
  yearFrom?: number;
  yearTo?: number;
};

export type ManufacturerSeedEntry = {
  slug: string;
  name: string;
  country: string;
  models: ManufacturerSeedModel[];
};

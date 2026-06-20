const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api";

type VpicResult = {
  Make_ID?: number;
  MakeId?: number;
  Make_Name?: string;
  MakeName?: string;
  Model_ID?: number;
  ModelId?: number;
  Model_Name?: string;
  ModelName?: string;
};

type VpicResponse = {
  Count: number;
  Results: VpicResult[];
};

async function fetchVpic<T>(path: string): Promise<T> {
  const response = await fetch(`${VPIC_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`NHTSA vPIC request failed (${response.status}): ${path}`);
  }
  return response.json() as Promise<T>;
}

export type NhtsaMake = {
  makeId: number;
  makeName: string;
};

export async function fetchAllMakes(): Promise<NhtsaMake[]> {
  const data = await fetchVpic<VpicResponse>("/vehicles/GetAllMakes?format=json");
  return data.Results.map((row) => ({
    makeId: row.Make_ID ?? row.MakeId ?? 0,
    makeName: (row.Make_Name ?? row.MakeName ?? "").trim(),
  })).filter((row) => row.makeId > 0 && row.makeName.length > 0);
}

export async function fetchModelsForMakeId(makeId: number) {
  const data = await fetchVpic<VpicResponse>(
    `/vehicles/GetModelsForMakeId/${makeId}?format=json`,
  );
  return data.Results.map((row) => ({
    modelId: row.Model_ID ?? row.ModelId ?? 0,
    modelName: (row.Model_Name ?? row.ModelName ?? "").trim(),
  })).filter((row) => row.modelId > 0 && row.modelName.length > 0);
}

export async function fetchCarMakesForVehicleType() {
  const data = await fetchVpic<VpicResponse>(
    "/vehicles/GetMakesForVehicleType/car?format=json",
  );
  return data.Results.map((row) => ({
    makeId: row.MakeId ?? row.Make_ID ?? 0,
    makeName: (row.MakeName ?? row.Make_Name ?? "").trim(),
  })).filter((row) => row.makeId > 0 && row.makeName.length > 0);
}

export const NHTSA_DATASET_VERSION = "nhtsa-vpic-api";

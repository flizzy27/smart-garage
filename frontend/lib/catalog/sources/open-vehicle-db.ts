const OVD_BASE =
  "https://raw.githubusercontent.com/plowman/open-vehicle-db/master/data";

export type OvdMakeEntry = {
  first_year: number;
  last_year: number;
  make_id: number;
  make_name: string;
  make_slug: string;
  models: Record<
    string,
    {
      model_id: number;
      model_name: string;
      model_styles: Record<string, unknown>;
      vehicle_type: string;
      years: number[];
    }
  >;
};

export type OvdStyleEntry = {
  years: number[];
};

export type OvdMakeStyles = Record<string, Record<string, OvdStyleEntry>>;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchMakesAndModels(): Promise<OvdMakeEntry[]> {
  const data = await fetchJson<Record<string, OvdMakeEntry>>(
    `${OVD_BASE}/makes_and_models.json`,
  );
  return Object.values(data);
}

export async function fetchMakeStyles(makeSlug: string): Promise<OvdMakeStyles> {
  return fetchJson<OvdMakeStyles>(`${OVD_BASE}/styles/${makeSlug}.json`);
}

export const OVD_DATASET_VERSION = "plowman/open-vehicle-db@master";

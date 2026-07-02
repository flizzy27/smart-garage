import { describe, expect, it } from "vitest";
import {
  parseDisplacementCc,
  parseFuelType,
  resolveBrandAndModel,
} from "@/lib/catalog/datasets/parse";

describe("Kaggle catalog parsing", () => {
  it("canonicalizes known manufacturer aliases", () => {
    expect(resolveBrandAndModel("VW", "Golf")?.brand.slug).toBe("volkswagen");
    expect(resolveBrandAndModel("MERCEDES", "GT 63 S")?.brand.slug).toBe("mercedes-benz");
  });

  it("prefers a known make prefix from the model field", () => {
    const resolved = resolveBrandAndModel("BMW", "Mclaren 720s");

    expect(resolved?.brand.slug).toBe("mclaren");
    expect(resolved?.modelName).toBe("720s");
  });

  it("maps electrified fuel types into existing enums", () => {
    expect(parseFuelType("plug in hyrbrid")).toBe("PLUGIN_HYBRID");
    expect(parseFuelType("Petrol, Hybrid")).toBe("HYBRID");
    expect(parseFuelType("Electric")).toBe("ELECTRIC");
  });

  it("does not treat battery capacity as displacement", () => {
    expect(parseDisplacementCc("82 kWh", { isElectric: true })).toBeNull();
    expect(parseDisplacementCc("3,982 cc")).toBe(3982);
  });
});

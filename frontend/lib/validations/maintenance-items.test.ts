import { describe, expect, it } from "vitest";
import { dropBlankItems, maintenanceItemsArraySchema, parseItemsJson } from "./maintenance-items";

describe("maintenanceItemsArraySchema", () => {
  it("accepts a valid item list", () => {
    const parsed = maintenanceItemsArraySchema.parse([
      {
        category: "ENGINE_OIL",
        productName: "Motul 8100 Power 5W-40",
        quantity: 5.7,
        unit: "LITERS",
      },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].category).toBe("ENGINE_OIL");
  });

  it("defaults category to OTHER when omitted", () => {
    const parsed = maintenanceItemsArraySchema.parse([{}]);
    expect(parsed[0].category).toBe("OTHER");
  });

  it("rejects an unknown category", () => {
    expect(() =>
      maintenanceItemsArraySchema.parse([{ category: "NOT_A_CATEGORY" }]),
    ).toThrow();
  });

  it("rejects negative quantities", () => {
    expect(() =>
      maintenanceItemsArraySchema.parse([{ category: "ENGINE_OIL", quantity: -1 }]),
    ).toThrow();
  });
});

describe("parseItemsJson", () => {
  it("returns an empty array for empty/missing input", () => {
    expect(parseItemsJson(null)).toEqual([]);
    expect(parseItemsJson("")).toEqual([]);
  });

  it("parses and validates a JSON payload", () => {
    const items = parseItemsJson(
      JSON.stringify([{ category: "OIL_FILTER", partNumber: "HU 6002 z" }]),
    );
    expect(items).toHaveLength(1);
    expect(items[0].partNumber).toBe("HU 6002 z");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseItemsJson("not json")).toThrow();
  });
});

describe("dropBlankItems", () => {
  it("removes fully empty rows but keeps rows with any meaningful value", () => {
    const items = maintenanceItemsArraySchema.parse([
      {},
      { category: "ENGINE_OIL", quantity: 5.7 },
      { category: "OTHER", notes: "Checked levels" },
    ]);
    const cleaned = dropBlankItems(items);
    expect(cleaned).toHaveLength(2);
  });
});

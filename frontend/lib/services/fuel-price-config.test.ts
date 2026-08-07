import { describe, expect, it } from "vitest";
import { looksLikeApiKey, maskApiKey } from "@/lib/services/fuel-price-config";

describe("looksLikeApiKey", () => {
  it("accepts a UUID in either case, with surrounding whitespace", () => {
    expect(looksLikeApiKey("00000000-0000-0000-0000-000000000002")).toBe(true);
    expect(looksLikeApiKey("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(true);
    expect(looksLikeApiKey("  00000000-0000-0000-0000-000000000002  ")).toBe(
      true,
    );
  });

  it("rejects the shapes people actually paste by mistake", () => {
    expect(looksLikeApiKey("")).toBe(false);
    // A truncated key.
    expect(looksLikeApiKey("00000000-0000-0000-0000")).toBe(false);
    // The whole line out of the email.
    expect(
      looksLikeApiKey("Your key: 00000000-0000-0000-0000-000000000002"),
    ).toBe(false);
    // A non-hex character that still has the right shape.
    expect(looksLikeApiKey("zzzzzzzz-0000-0000-0000-000000000002")).toBe(false);
  });
});

describe("maskApiKey", () => {
  it("shows enough to recognise the key but not to use it", () => {
    const masked = maskApiKey("abcd1234-0000-0000-0000-00005678efgh");
    expect(masked.startsWith("abcd")).toBe(true);
    expect(masked.endsWith("efgh")).toBe(true);
    expect(masked).not.toContain("1234-0000-0000-0000-0000");
  });

  it("reveals nothing at all about a short value", () => {
    expect(maskApiKey("short")).toBe("••••");
    expect(maskApiKey("12345678")).toBe("••••");
  });
});

import { describe, expect, it } from "vitest";
import { isWellFormedSessionToken, SESSION_COOKIE } from "./session-token";

const VALID_TOKEN = "a".repeat(64);

describe("isWellFormedSessionToken", () => {
  it("accepts a real 32-byte hex token", () => {
    expect(isWellFormedSessionToken(VALID_TOKEN)).toBe(true);
    expect(isWellFormedSessionToken("0123456789abcdef".repeat(4))).toBe(true);
  });

  it("rejects undefined and null", () => {
    expect(isWellFormedSessionToken(undefined)).toBe(false);
    expect(isWellFormedSessionToken(null)).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isWellFormedSessionToken("")).toBe(false);
  });

  it("rejects malformed JSON injected as a cookie value", () => {
    expect(isWellFormedSessionToken('{"userId":"1"}')).toBe(false);
  });

  it("rejects random garbage / corrupted cookie values", () => {
    expect(isWellFormedSessionToken("not-a-real-session-token")).toBe(false);
    expect(isWellFormedSessionToken("<<>>??!!")).toBe(false);
  });

  it("rejects tokens with uppercase hex (createSession only emits lowercase)", () => {
    expect(isWellFormedSessionToken(VALID_TOKEN.toUpperCase())).toBe(false);
  });

  it("rejects tokens that are the wrong length (truncated/old format)", () => {
    expect(isWellFormedSessionToken(VALID_TOKEN.slice(0, 32))).toBe(false);
    expect(isWellFormedSessionToken(VALID_TOKEN + "aa")).toBe(false);
  });

  it("uses the expected cookie name", () => {
    expect(SESSION_COOKIE).toBe("sg_session");
  });
});

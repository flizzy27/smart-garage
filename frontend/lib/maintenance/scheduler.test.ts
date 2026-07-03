import { describe, expect, it } from "vitest";
import {
  compareServiceRecency,
  computeNextDue,
  pickLastService,
  type ServiceRecordLike,
} from "./scheduler";

function record(
  partial: Partial<ServiceRecordLike> & Pick<ServiceRecordLike, "id">,
): ServiceRecordLike {
  return {
    performedAt: new Date("2020-01-01T00:00:00Z"),
    odometerKm: null,
    createdAt: new Date("2020-01-01T00:00:00Z"),
    ...partial,
  };
}

describe("pickLastService — the actual last service is derived from history", () => {
  it("Scenario A: a back-dated older service does NOT become the last service", () => {
    // Newest real service is at 150k / 2026-06-01. An older 130k / 2025-06-01
    // service is added afterwards (its row is created last).
    const newest = record({
      id: "newest",
      odometerKm: 150_000,
      performedAt: new Date("2026-06-01"),
      createdAt: new Date("2026-06-10T10:00:00Z"), // inserted first
    });
    const backdated = record({
      id: "backdated",
      odometerKm: 130_000,
      performedAt: new Date("2025-06-01"),
      createdAt: new Date("2026-06-20T10:00:00Z"), // inserted LAST
    });

    const last = pickLastService([newest, backdated]);
    expect(last?.id).toBe("newest");
    expect(last?.odometerKm).toBe(150_000);
  });

  it("Scenario B: a genuinely newer service (160k) becomes the last service", () => {
    const existing = record({
      id: "existing",
      odometerKm: 150_000,
      performedAt: new Date("2026-01-01"),
    });
    const newer = record({
      id: "newer",
      odometerKm: 160_000,
      performedAt: new Date("2026-06-01"),
    });

    expect(pickLastService([existing, newer])?.id).toBe("newer");
  });

  it("Scenario D: ordering is stable and consistent regardless of input order", () => {
    const a = record({ id: "a", odometerKm: 100_000, performedAt: new Date("2024-01-01") });
    const b = record({ id: "b", odometerKm: 120_000, performedAt: new Date("2025-01-01") });
    const c = record({ id: "c", odometerKm: 90_000, performedAt: new Date("2023-01-01") });

    expect(pickLastService([a, b, c])?.id).toBe("b");
    expect(pickLastService([c, b, a])?.id).toBe("b");
    expect(pickLastService([b, a, c])?.id).toBe("b");
  });

  it("uses the row createdAt only as a last-resort tie-breaker, never to rank recency", () => {
    // Same odometer + same date → the later-created row wins, deterministically.
    const first = record({
      id: "first",
      odometerKm: 100_000,
      performedAt: new Date("2025-01-01"),
      createdAt: new Date("2025-01-02T00:00:00Z"),
    });
    const second = record({
      id: "second",
      odometerKm: 100_000,
      performedAt: new Date("2025-01-01"),
      createdAt: new Date("2025-01-03T00:00:00Z"),
    });
    expect(pickLastService([first, second])?.id).toBe("second");
    expect(compareServiceRecency(second, first)).toBeGreaterThan(0);
  });

  it("returns null for an empty history", () => {
    expect(pickLastService([])).toBeNull();
  });

  it("bug report: 141,834 km (Mar 2026) stays latest over 132,511 km (Nov 2025)", () => {
    const newer = record({
      id: "newer-oil",
      odometerKm: 141_834,
      performedAt: new Date("2026-03-19"),
      createdAt: new Date("2026-03-20T00:00:00Z"),
    });
    const older = record({
      id: "older-oil",
      odometerKm: 132_511,
      performedAt: new Date("2025-11-10"),
      createdAt: new Date("2026-03-21T00:00:00Z"), // inserted later, still older service
    });
    expect(pickLastService([newer, older])?.id).toBe("newer-oil");
    expect(pickLastService([older, newer])?.id).toBe("newer-oil");
  });

  it("ranks a service with an odometer above one without", () => {
    const withKm = record({ id: "withKm", odometerKm: 50_000, performedAt: new Date("2020-01-01") });
    const noKm = record({ id: "noKm", odometerKm: null, performedAt: new Date("2026-01-01") });
    expect(pickLastService([withKm, noKm])?.id).toBe("withKm");
  });
});

describe("computeNextDue driven by the derived last service (Scenario A end-to-end)", () => {
  const interval = { intervalKm: 15_000, intervalMonths: 12 };
  const thresholds = { dueSoonDays: 30, dueSoonKm: 1500 };

  it("keeps next due anchored to the 150k service even after a 130k entry is added", () => {
    const records: ServiceRecordLike[] = [
      record({ id: "n", odometerKm: 150_000, performedAt: new Date("2026-06-01") }),
      record({ id: "old", odometerKm: 130_000, performedAt: new Date("2025-06-01") }),
    ];
    const last = pickLastService(records)!;

    const due = computeNextDue(
      interval,
      { performedAt: last.performedAt, odometerKm: last.odometerKm },
      151_000, // current odometer
      new Date("2026-06-15"),
      thresholds,
    );

    // Next km due is anchored to 150k, not 130k.
    expect(due.nextDueOdometerKm).toBe(165_000);
  });

  it("Scenario C: a schedule created with a stated last service computes next due from it", () => {
    const due = computeNextDue(
      { intervalKm: 15_000, intervalMonths: null },
      { performedAt: null, odometerKm: 140_000 },
      140_000,
      new Date("2026-06-15"),
      thresholds,
    );
    expect(due.nextDueOdometerKm).toBe(155_000);
  });
});

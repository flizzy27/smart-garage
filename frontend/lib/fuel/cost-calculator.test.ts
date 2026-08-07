import { describe, expect, it } from "vitest";
import {
  computeBudget,
  computeCommute,
  computeComparison,
  computeDetour,
  computeReimbursement,
  computeTank,
  computeTrip,
  distanceForLiters,
  litersForDistance,
} from "@/lib/fuel/cost-calculator";

describe("litersForDistance / distanceForLiters", () => {
  it("is a round trip through the same consumption", () => {
    const liters = litersForDistance(250, 7.5);
    expect(liters).toBeCloseTo(18.75, 10);
    expect(distanceForLiters(liters!, 7.5)).toBeCloseTo(250, 10);
  });

  it("refuses to guess when a figure is missing", () => {
    expect(litersForDistance(0, 7.5)).toBeNull();
    expect(litersForDistance(100, 0)).toBeNull();
    expect(distanceForLiters(40, 0)).toBeNull();
  });
});

describe("computeTrip", () => {
  it("computes fuel, total and per-distance cost", () => {
    const result = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;

    expect(result.liters).toBeCloseTo(7.5, 10);
    expect(result.fuelCost).toBeCloseTo(13.5, 10);
    expect(result.totalCost).toBeCloseTo(13.5, 10);
    expect(result.costPerKm).toBeCloseTo(0.135, 10);
    expect(result.costPer100Km).toBeCloseTo(13.5, 10);
  });

  it("doubles the distance for a round trip", () => {
    const oneWay = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;
    const there = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
      roundTrip: true,
    })!;

    expect(there.distanceKm).toBe(200);
    expect(there.totalCost).toBeCloseTo(oneWay.totalCost * 2, 10);
  });

  it("adds extra costs to the total but not to the fuel", () => {
    const result = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
      extraCost: 6.5,
    })!;

    expect(result.fuelCost).toBeCloseTo(13.5, 10);
    expect(result.extraCost).toBe(6.5);
    expect(result.totalCost).toBeCloseTo(20, 10);
    // Extras belong in the per-distance figure too — that is what the trip costs.
    expect(result.costPerKm).toBeCloseTo(0.2, 10);
  });

  it("splits the total, extras included, between passengers", () => {
    const result = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
      extraCost: 6.5,
      passengers: 4,
    })!;

    expect(result.costPerPassenger).toBeCloseTo(5, 10);
  });

  it("never divides by a passenger count below one", () => {
    const result = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
      passengers: 0,
    })!;

    expect(result.passengers).toBe(1);
    expect(result.costPerPassenger).toBeCloseTo(result.totalCost, 10);
  });

  it("returns null instead of zero when an input is missing", () => {
    expect(
      computeTrip({
        distanceKm: 0,
        consumptionLPer100Km: 7.5,
        pricePerLiter: 1.8,
      }),
    ).toBeNull();
    expect(
      computeTrip({
        distanceKm: 100,
        consumptionLPer100Km: 0,
        pricePerLiter: 1.8,
      }),
    ).toBeNull();
  });

  it("accepts a price of zero — a free tank is a valid answer", () => {
    const result = computeTrip({
      distanceKm: 100,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 0,
    })!;
    expect(result.totalCost).toBe(0);
  });
});

describe("computeTank", () => {
  it("prices the missing half of the tank", () => {
    const result = computeTank({
      tankLiters: 50,
      levelPercent: 50,
      pricePerLiter: 1.8,
      consumptionLPer100Km: 7.5,
    })!;

    expect(result.remainingLiters).toBe(25);
    expect(result.missingLiters).toBe(25);
    expect(result.refillCost).toBeCloseTo(45, 10);
    expect(result.fullTankCost).toBeCloseTo(90, 10);
    expect(result.remainingRangeKm).toBeCloseTo(333.33, 1);
    expect(result.fullRangeKm).toBeCloseTo(666.67, 1);
  });

  it("clamps a nonsense fill level into 0–100", () => {
    expect(
      computeTank({
        tankLiters: 50,
        levelPercent: 180,
        pricePerLiter: 1.8,
        consumptionLPer100Km: 7.5,
      })!.missingLiters,
    ).toBe(0);
    expect(
      computeTank({
        tankLiters: 50,
        levelPercent: -20,
        pricePerLiter: 1.8,
        consumptionLPer100Km: 7.5,
      })!.missingLiters,
    ).toBe(50);
  });

  it("still prices a fill-up when no consumption is known", () => {
    const result = computeTank({
      tankLiters: 50,
      levelPercent: 0,
      pricePerLiter: 1.8,
      consumptionLPer100Km: 0,
    })!;
    expect(result.refillCost).toBeCloseTo(90, 10);
    expect(result.fullRangeKm).toBeNull();
  });
});

describe("computeBudget", () => {
  it("turns money into fuel and distance", () => {
    const result = computeBudget({
      budget: 50,
      pricePerLiter: 2,
      consumptionLPer100Km: 5,
    })!;

    expect(result.liters).toBe(25);
    expect(result.distanceKm).toBe(500);
  });

  it("needs a price to say anything", () => {
    expect(
      computeBudget({ budget: 50, pricePerLiter: 0, consumptionLPer100Km: 5 }),
    ).toBeNull();
  });
});

describe("computeCommute", () => {
  it("counts the way back and scales to a year", () => {
    const result = computeCommute({
      oneWayKm: 20,
      daysPerWeek: 5,
      weeksPerYear: 46,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;

    expect(result.dailyKm).toBe(40);
    expect(result.annualKm).toBe(9200);
    expect(result.annualLiters).toBeCloseTo(690, 10);
    expect(result.costPerDay).toBeCloseTo(5.4, 10);
    expect(result.costPerWeek).toBeCloseTo(27, 10);
    expect(result.costPerYear).toBeCloseTo(1242, 10);
    // A month is a twelfth of the year — anything else drifts from the total.
    expect(result.costPerMonth).toBeCloseTo(1242 / 12, 10);
  });

  it("can be told the trip is one way only", () => {
    const result = computeCommute({
      oneWayKm: 20,
      returnTrip: false,
      daysPerWeek: 5,
      weeksPerYear: 46,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;
    expect(result.dailyKm).toBe(20);
  });
});

describe("computeComparison", () => {
  it("reports the yearly saving of a thriftier car", () => {
    const result = computeComparison({
      annualKm: 15_000,
      current: { consumptionLPer100Km: 8, pricePerLiter: 1.8 },
      alternative: { consumptionLPer100Km: 6, pricePerLiter: 1.8 },
    })!;

    expect(result.currentAnnualCost).toBeCloseTo(2160, 10);
    expect(result.alternativeAnnualCost).toBeCloseTo(1620, 10);
    expect(result.annualSaving).toBeCloseTo(540, 10);
    expect(result.monthlySaving).toBeCloseTo(45, 10);
  });

  it("turns negative when the alternative is more expensive", () => {
    const result = computeComparison({
      annualKm: 15_000,
      current: { consumptionLPer100Km: 6, pricePerLiter: 1.8 },
      alternative: { consumptionLPer100Km: 8, pricePerLiter: 1.8 },
    })!;
    expect(result.annualSaving).toBeLessThan(0);
    expect(result.breakEvenKm).toBeNull();
  });

  it("earns back a one-off cost over distance and time", () => {
    const result = computeComparison({
      annualKm: 15_000,
      current: { consumptionLPer100Km: 8, pricePerLiter: 1.8 },
      alternative: { consumptionLPer100Km: 6, pricePerLiter: 1.8 },
      switchCost: 2700,
    })!;

    // 0.036 €/km saved → 2700 € pays back after 75 000 km, i.e. five years.
    expect(result.breakEvenKm).toBeCloseTo(75_000, 6);
    expect(result.breakEvenYears).toBeCloseTo(5, 6);
  });

  it("never claims a break-even while the alternative costs more", () => {
    const result = computeComparison({
      annualKm: 15_000,
      current: { consumptionLPer100Km: 6, pricePerLiter: 1.8 },
      alternative: { consumptionLPer100Km: 8, pricePerLiter: 1.8 },
      switchCost: 2700,
    })!;
    expect(result.breakEvenKm).toBeNull();
    expect(result.breakEvenYears).toBeNull();
  });
});

describe("computeDetour", () => {
  it("subtracts the fuel burned on the detour from the saving", () => {
    const result = computeDetour({
      liters: 40,
      pricePerLiterHere: 1.9,
      pricePerLiterThere: 1.8,
      detourKm: 5,
      consumptionLPer100Km: 7.5,
    })!;

    expect(result.grossSaving).toBeCloseTo(4, 10);
    // 10 km there and back at 7.5 L/100 km = 0.75 L at the cheaper price.
    expect(result.detourKm).toBe(10);
    expect(result.detourLiters).toBeCloseTo(0.75, 10);
    expect(result.detourCost).toBeCloseTo(1.35, 10);
    expect(result.netSaving).toBeCloseTo(2.65, 10);
    expect(result.worthIt).toBe(true);
  });

  it("says no when the detour eats the saving", () => {
    const result = computeDetour({
      liters: 20,
      pricePerLiterHere: 1.82,
      pricePerLiterThere: 1.8,
      detourKm: 8,
      consumptionLPer100Km: 9,
    })!;

    expect(result.grossSaving).toBeCloseTo(0.4, 10);
    expect(result.netSaving).toBeLessThan(0);
    expect(result.worthIt).toBe(false);
  });

  it("reports the price gap that would make it break even", () => {
    const result = computeDetour({
      liters: 40,
      pricePerLiterHere: 1.9,
      pricePerLiterThere: 1.8,
      detourKm: 5,
      consumptionLPer100Km: 7.5,
    })!;

    expect(result.breakEvenPriceDiff).toBeCloseTo(1.35 / 40, 10);
  });
});

describe("computeReimbursement", () => {
  it("compares the payout with the fuel actually burned", () => {
    const result = computeReimbursement({
      distanceKm: 100,
      ratePerKm: 0.3,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;

    expect(result.payout).toBeCloseTo(30, 10);
    expect(result.fuelCost).toBeCloseTo(13.5, 10);
    expect(result.difference).toBeCloseTo(16.5, 10);
    expect(result.breakEvenRatePerKm).toBeCloseTo(0.135, 10);
  });

  it("goes negative when the rate does not cover the fuel", () => {
    const result = computeReimbursement({
      distanceKm: 100,
      ratePerKm: 0.1,
      consumptionLPer100Km: 7.5,
      pricePerLiter: 1.8,
    })!;
    expect(result.difference).toBeLessThan(0);
  });
});

/**
 * Fuel cost calculator — pure maths, no React, no units.
 *
 * Everything here works in **metric storage units** (kilometres, litres,
 * L/100 km) and in **major currency units** (euros/dollars, not cents), exactly
 * like the rest of `lib/fuel`. Converting what the user typed into these units
 * — and the results back out — is the UI's job (`lib/regional/*`), so a change
 * of preference can never silently reinterpret a number in here.
 *
 * Every function returns `null` when its inputs cannot produce a meaningful
 * answer (missing figure, zero distance, …) instead of `0` or `NaN`, so the UI
 * can show a placeholder rather than a confidently wrong result.
 */

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Litres burned over a distance at a given consumption. */
export function litersForDistance(
  distanceKm: number,
  consumptionLPer100Km: number,
): number | null {
  if (!isPositive(distanceKm) || !isPositive(consumptionLPer100Km)) return null;
  return (distanceKm / 100) * consumptionLPer100Km;
}

/** How far a given amount of fuel takes you. */
export function distanceForLiters(
  liters: number,
  consumptionLPer100Km: number,
): number | null {
  if (!isPositive(liters) || !isPositive(consumptionLPer100Km)) return null;
  return (liters / consumptionLPer100Km) * 100;
}

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

export type TripInput = {
  distanceKm: number;
  consumptionLPer100Km: number;
  /** Major currency units per litre. */
  pricePerLiter: number;
  /** Doubles the distance — the single most common thing people forget. */
  roundTrip?: boolean;
  /** People sharing the bill, at least 1. */
  passengers?: number;
  /** Extra fixed costs for the trip (tolls, parking, ferry, …). */
  extraCost?: number;
};

export type TripResult = {
  /** Distance actually driven — doubled when `roundTrip` is set. */
  distanceKm: number;
  liters: number;
  fuelCost: number;
  extraCost: number;
  totalCost: number;
  costPerKm: number;
  costPer100Km: number;
  costPerPassenger: number;
  passengers: number;
};

export function computeTrip(input: TripInput): TripResult | null {
  const {
    consumptionLPer100Km,
    pricePerLiter,
    roundTrip = false,
    extraCost = 0,
  } = input;

  const distanceKm = isPositive(input.distanceKm)
    ? input.distanceKm * (roundTrip ? 2 : 1)
    : 0;

  if (!isPositive(distanceKm) || !isPositive(consumptionLPer100Km)) return null;
  if (!isNonNegative(pricePerLiter)) return null;

  const passengers = Math.max(1, Math.floor(input.passengers ?? 1));
  const liters = (distanceKm / 100) * consumptionLPer100Km;
  const fuelCost = liters * pricePerLiter;
  const extras = isNonNegative(extraCost) ? extraCost : 0;
  const totalCost = fuelCost + extras;

  return {
    distanceKm,
    liters,
    fuelCost,
    extraCost: extras,
    totalCost,
    costPerKm: totalCost / distanceKm,
    costPer100Km: (totalCost / distanceKm) * 100,
    costPerPassenger: totalCost / passengers,
    passengers,
  };
}

// ---------------------------------------------------------------------------
// Tank
// ---------------------------------------------------------------------------

export type TankInput = {
  tankLiters: number;
  /** Current fill level, 0–100. */
  levelPercent: number;
  pricePerLiter: number;
  consumptionLPer100Km: number;
};

export type TankResult = {
  remainingLiters: number;
  missingLiters: number;
  refillCost: number;
  fullTankCost: number;
  /** Range left on what is in the tank right now. */
  remainingRangeKm: number | null;
  /** Range of a completely full tank. */
  fullRangeKm: number | null;
};

export function computeTank(input: TankInput): TankResult | null {
  const { tankLiters, pricePerLiter, consumptionLPer100Km } = input;
  if (!isPositive(tankLiters) || !isNonNegative(pricePerLiter)) return null;

  const level = Math.min(100, Math.max(0, input.levelPercent));
  const remainingLiters = (tankLiters * level) / 100;
  const missingLiters = tankLiters - remainingLiters;

  return {
    remainingLiters,
    missingLiters,
    refillCost: missingLiters * pricePerLiter,
    fullTankCost: tankLiters * pricePerLiter,
    remainingRangeKm: distanceForLiters(remainingLiters, consumptionLPer100Km),
    fullRangeKm: distanceForLiters(tankLiters, consumptionLPer100Km),
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export type BudgetInput = {
  /** Money available, in major currency units. */
  budget: number;
  pricePerLiter: number;
  consumptionLPer100Km: number;
};

export type BudgetResult = {
  liters: number;
  distanceKm: number | null;
};

export function computeBudget(input: BudgetInput): BudgetResult | null {
  const { budget, pricePerLiter, consumptionLPer100Km } = input;
  if (!isPositive(budget) || !isPositive(pricePerLiter)) return null;

  const liters = budget / pricePerLiter;
  return {
    liters,
    distanceKm: distanceForLiters(liters, consumptionLPer100Km),
  };
}

// ---------------------------------------------------------------------------
// Commute / recurring trips
// ---------------------------------------------------------------------------

export type CommuteInput = {
  /** Distance of a single leg. */
  oneWayKm: number;
  /** Counts the way back — on by default because a commute is a return trip. */
  returnTrip?: boolean;
  daysPerWeek: number;
  /** Working weeks after holidays; 46 is a realistic default. */
  weeksPerYear: number;
  consumptionLPer100Km: number;
  pricePerLiter: number;
};

export type CommuteResult = {
  dailyKm: number;
  annualKm: number;
  annualLiters: number;
  costPerDay: number;
  costPerWeek: number;
  costPerMonth: number;
  costPerYear: number;
};

export function computeCommute(input: CommuteInput): CommuteResult | null {
  const {
    oneWayKm,
    returnTrip = true,
    daysPerWeek,
    weeksPerYear,
    consumptionLPer100Km,
    pricePerLiter,
  } = input;

  if (!isPositive(oneWayKm) || !isPositive(consumptionLPer100Km)) return null;
  if (!isPositive(daysPerWeek) || !isPositive(weeksPerYear)) return null;
  if (!isNonNegative(pricePerLiter)) return null;

  const dailyKm = oneWayKm * (returnTrip ? 2 : 1);
  const annualKm = dailyKm * daysPerWeek * weeksPerYear;
  const annualLiters = (annualKm / 100) * consumptionLPer100Km;
  const costPerYear = annualLiters * pricePerLiter;
  const costPerDay = ((dailyKm / 100) * consumptionLPer100Km) * pricePerLiter;

  return {
    dailyKm,
    annualKm,
    annualLiters,
    costPerDay,
    costPerWeek: costPerDay * daysPerWeek,
    // Months are the awkward unit here: a twelfth of the year is the only
    // figure that stays consistent with the annual total.
    costPerMonth: costPerYear / 12,
    costPerYear,
  };
}

// ---------------------------------------------------------------------------
// Comparison (second car, other fuel grade, …)
// ---------------------------------------------------------------------------

export type ComparisonSide = {
  consumptionLPer100Km: number;
  pricePerLiter: number;
};

export type ComparisonInput = {
  annualKm: number;
  current: ComparisonSide;
  alternative: ComparisonSide;
  /** One-off extra cost of the alternative (higher purchase price, conversion). */
  switchCost?: number;
};

export type ComparisonResult = {
  currentAnnualCost: number;
  alternativeAnnualCost: number;
  /** Positive → the alternative is cheaper. */
  annualSaving: number;
  monthlySaving: number;
  savingPerKm: number;
  /** Distance until a one-off `switchCost` is earned back. */
  breakEvenKm: number | null;
  breakEvenYears: number | null;
};

export function computeComparison(
  input: ComparisonInput,
): ComparisonResult | null {
  const { annualKm, current, alternative, switchCost = 0 } = input;
  if (!isPositive(annualKm)) return null;
  if (!isPositive(current.consumptionLPer100Km)) return null;
  if (!isPositive(alternative.consumptionLPer100Km)) return null;
  if (!isNonNegative(current.pricePerLiter)) return null;
  if (!isNonNegative(alternative.pricePerLiter)) return null;

  const costPerKm = (side: ComparisonSide) =>
    (side.consumptionLPer100Km / 100) * side.pricePerLiter;

  const currentPerKm = costPerKm(current);
  const alternativePerKm = costPerKm(alternative);
  const savingPerKm = currentPerKm - alternativePerKm;
  const annualSaving = savingPerKm * annualKm;

  // A one-off cost only ever pays off while the alternative is actually
  // cheaper per kilometre — otherwise the "break-even" would be a negative
  // distance, which reads as "you already earned it back".
  const payingOff = savingPerKm > 0 && switchCost > 0;

  return {
    currentAnnualCost: currentPerKm * annualKm,
    alternativeAnnualCost: alternativePerKm * annualKm,
    annualSaving,
    monthlySaving: annualSaving / 12,
    savingPerKm,
    breakEvenKm: payingOff ? switchCost / savingPerKm : null,
    breakEvenYears: payingOff ? switchCost / annualSaving : null,
  };
}

// ---------------------------------------------------------------------------
// Detour to a cheaper station
// ---------------------------------------------------------------------------

export type DetourInput = {
  /** How much you are going to put in. */
  liters: number;
  pricePerLiterHere: number;
  pricePerLiterThere: number;
  /** Extra distance one way. */
  detourKm: number;
  /** Counts the way back — you normally have to drive back. */
  returnTrip?: boolean;
  consumptionLPer100Km: number;
};

export type DetourResult = {
  grossSaving: number;
  detourKm: number;
  detourLiters: number;
  /** Fuel burned on the detour, priced at the *cheaper* pump. */
  detourCost: number;
  netSaving: number;
  worthIt: boolean;
  /** Price gap per litre at which the detour exactly breaks even. */
  breakEvenPriceDiff: number | null;
};

export function computeDetour(input: DetourInput): DetourResult | null {
  const {
    liters,
    pricePerLiterHere,
    pricePerLiterThere,
    returnTrip = true,
    consumptionLPer100Km,
  } = input;

  if (!isPositive(liters) || !isPositive(consumptionLPer100Km)) return null;
  if (!isNonNegative(pricePerLiterHere) || !isNonNegative(pricePerLiterThere)) {
    return null;
  }

  const detourKm = isPositive(input.detourKm)
    ? input.detourKm * (returnTrip ? 2 : 1)
    : 0;

  const grossSaving = (pricePerLiterHere - pricePerLiterThere) * liters;
  const detourLiters = (detourKm / 100) * consumptionLPer100Km;
  const detourCost = detourLiters * pricePerLiterThere;
  const netSaving = grossSaving - detourCost;

  return {
    grossSaving,
    detourKm,
    detourLiters,
    detourCost,
    netSaving,
    worthIt: netSaving > 0,
    breakEvenPriceDiff: liters > 0 ? detourCost / liters : null,
  };
}

// ---------------------------------------------------------------------------
// Mileage reimbursement
// ---------------------------------------------------------------------------

export type ReimbursementInput = {
  distanceKm: number;
  /** Paid out per kilometre, in major currency units. */
  ratePerKm: number;
  consumptionLPer100Km: number;
  pricePerLiter: number;
};

export type ReimbursementResult = {
  payout: number;
  fuelCost: number;
  /** Positive → the reimbursement covers more than the fuel. */
  difference: number;
  /** Rate at which payout and fuel cost cancel out. */
  breakEvenRatePerKm: number;
};

export function computeReimbursement(
  input: ReimbursementInput,
): ReimbursementResult | null {
  const { distanceKm, ratePerKm, consumptionLPer100Km, pricePerLiter } = input;
  if (!isPositive(distanceKm) || !isPositive(consumptionLPer100Km)) return null;
  if (!isNonNegative(ratePerKm) || !isNonNegative(pricePerLiter)) return null;

  const fuelCost = ((distanceKm / 100) * consumptionLPer100Km) * pricePerLiter;
  const payout = distanceKm * ratePerKm;

  return {
    payout,
    fuelCost,
    difference: payout - fuelCost,
    breakEvenRatePerKm: fuelCost / distanceKm,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import {
  distanceUnitLabel,
  formatDistance,
  kmToPreferred,
  preferredToKm,
  ratePerDistanceToPerKm,
  ratePerKmToPerDistance,
} from "@/lib/regional/distance";
import {
  consumptionToLPer100Km,
  consumptionUnitLabel,
  convertConsumption,
  formatVolume,
  preferredToLiters,
  pricePerVolumeUnit,
  pricePerVolumeUnitToPerLiter,
  volumeUnitLabel,
} from "@/lib/regional/volume";
import {
  computeBudget,
  computeCommute,
  computeComparison,
  computeDetour,
  computeReimbursement,
  computeTank,
  computeTrip,
} from "@/lib/fuel/cost-calculator";
import {
  CALCULATOR_SECTIONS,
  DEFAULT_SECTION_STATE,
  createDefaultCalculatorValues,
  migrateCalculatorValues,
  parseNumberInput,
  type CalculatorSectionId,
  type CalculatorSectionState,
  type CalculatorUnits,
  type CalculatorValues,
} from "@/lib/fuel/calculator-state";
import {
  clearCalculatorState,
  readCalculatorState,
  writeCalculatorState,
} from "@/lib/fuel/calculator-storage";
import type { CalculatorVehiclePreset } from "@/lib/services/fuel-calculator";
import { CalculatorSection } from "./CalculatorSection";
import { RoutePlanner } from "./RoutePlanner";
import {
  FieldGrid,
  NumberField,
  ResultGrid,
  ResultTile,
  SliderField,
  StepperField,
  ToggleField,
} from "./CalculatorControls";

type Props = {
  vehicles: CalculatorVehiclePreset[];
};

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const SECTION_ICON_PATHS: Record<CalculatorSectionId, string> = {
  vehicle: "M8 17h8M5 11l1.5-4.5h11L19 11M5 11v6h14v-6",
  route:
    "M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  trip: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  split: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  tank: "M4 6a2 2 0 012-2h6a2 2 0 012 2v14H4V6zm10 5h2a2 2 0 012 2v4a2 2 0 104 0V9l-3-3M4 12h10",
  budget: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M21 12a2 2 0 01-2 2h-4a2 2 0 010-4h4a2 2 0 012 2z",
  commute: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  compare: "M9 3v18M15 3v18M3 9h18M3 15h18",
  detour: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4",
  reimbursement:
    "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
};

export function FuelCostCalculator({ vehicles }: Props) {
  const t = useTranslations("fuelCalculator");
  const locale = useLocale();
  const { settings } = useUserSettings();
  const { distanceUnit, volumeUnit, currency } = settings;

  const units = useMemo<CalculatorUnits>(
    () => ({ distanceUnit, volumeUnit }),
    [distanceUnit, volumeUnit],
  );

  const [values, setValues] = useState<CalculatorValues>(() =>
    createDefaultCalculatorValues(units),
  );
  const [sections, setSections] =
    useState<CalculatorSectionState>(DEFAULT_SECTION_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [appliedVehicleId, setAppliedVehicleId] = useState<string | null>(null);
  const unitsRef = useRef(units);
  /** Set while a unit change has been detected but the values have not caught up. */
  const migrationPendingRef = useRef(false);

  // Restore the saved draft after mount. Reading localStorage during render
  // would mismatch the server-rendered defaults and blow up hydration.
  useEffect(() => {
    const stored = readCalculatorState(unitsRef.current);
    setValues(stored.values);
    setSections(stored.sections);
    setHydrated(true);
  }, []);

  // Switching km ↔ mi or L ↔ gal in the settings must rewrite the numbers on
  // screen, otherwise "100" would silently change meaning.
  useEffect(() => {
    const previous = unitsRef.current;
    if (
      previous.distanceUnit === units.distanceUnit &&
      previous.volumeUnit === units.volumeUnit
    ) {
      return;
    }
    unitsRef.current = units;
    migrationPendingRef.current = true;
    setValues((current) => migrateCalculatorValues(current, previous, units));
  }, [units]);

  useEffect(() => {
    if (!hydrated) return;
    // The migration above only schedules new values; this effect still runs in
    // the same commit holding the *old* numbers alongside the *new* units.
    // Writing that pair would stamp kilometres as miles, so skip one round and
    // let the re-render with migrated values do the saving.
    if (migrationPendingRef.current) {
      migrationPendingRef.current = false;
      return;
    }
    writeCalculatorState({ values, sections }, units);
  }, [hydrated, values, sections, units]);

  const setValue = useCallback(
    <K extends keyof CalculatorValues>(key: K, value: CalculatorValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const toggleSection = useCallback((id: CalculatorSectionId) => {
    setSections((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const allOpen = CALCULATOR_SECTIONS.every((id) => sections[id]);

  const setAllSections = useCallback((open: boolean) => {
    setSections(
      Object.fromEntries(
        CALCULATOR_SECTIONS.map((id) => [id, open]),
      ) as CalculatorSectionState,
    );
  }, []);

  const reset = useCallback(() => {
    clearCalculatorState();
    setValues(createDefaultCalculatorValues(unitsRef.current));
    setSections(DEFAULT_SECTION_STATE);
    setAppliedVehicleId(null);
  }, []);

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  const money = useCallback(
    (value: number | null | undefined, fractionDigits = 2) => {
      if (value == null || !Number.isFinite(value)) return "—";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    },
    [locale, currency],
  );

  const dist = useCallback(
    (km: number | null | undefined) =>
      km == null || !Number.isFinite(km)
        ? "—"
        : formatDistance(km, locale, distanceUnit),
    [locale, distanceUnit],
  );

  const vol = useCallback(
    (liters: number | null | undefined, digits = 1) =>
      liters == null || !Number.isFinite(liters)
        ? "—"
        : formatVolume(liters, locale, volumeUnit, digits),
    [locale, volumeUnit],
  );

  const distanceLabel = distanceUnitLabel(distanceUnit);
  const volumeLabel = volumeUnitLabel(volumeUnit);
  const consumptionLabel = consumptionUnitLabel(distanceUnit, volumeUnit);
  const priceLabel = `${currency}/${volumeLabel}`;

  // -------------------------------------------------------------------------
  // Inputs → metric
  // -------------------------------------------------------------------------

  const num = useCallback(
    (key: keyof CalculatorValues): number | null => {
      const raw = values[key];
      return typeof raw === "string" ? parseNumberInput(raw) : null;
    },
    [values],
  );

  const km = useCallback(
    (key: keyof CalculatorValues) => {
      const value = num(key);
      return value == null ? 0 : preferredToKm(value, distanceUnit);
    },
    [num, distanceUnit],
  );

  const liters = useCallback(
    (key: keyof CalculatorValues) => {
      const value = num(key);
      return value == null ? 0 : preferredToLiters(value, volumeUnit);
    },
    [num, volumeUnit],
  );

  const lPer100Km = useCallback(
    (key: keyof CalculatorValues) => {
      const value = num(key);
      return value == null
        ? 0
        : consumptionToLPer100Km(value, distanceUnit, volumeUnit);
    },
    [num, distanceUnit, volumeUnit],
  );

  const perLiter = useCallback(
    (key: keyof CalculatorValues) => {
      const value = num(key);
      return value == null ? 0 : pricePerVolumeUnitToPerLiter(value, volumeUnit);
    },
    [num, volumeUnit],
  );

  const consumption = lPer100Km("consumption");
  const price = perLiter("price");
  const passengers = Math.max(1, Math.round(num("passengers") ?? 1));

  // -------------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------------

  const trip = computeTrip({
    distanceKm: km("distance"),
    consumptionLPer100Km: consumption,
    pricePerLiter: price,
    roundTrip: values.roundTrip,
    passengers,
    extraCost: num("extraCost") ?? 0,
  });

  const tank = computeTank({
    tankLiters: liters("tankSize"),
    levelPercent: num("tankLevel") ?? 0,
    pricePerLiter: price,
    consumptionLPer100Km: consumption,
  });

  const budget = computeBudget({
    budget: num("budget") ?? 0,
    pricePerLiter: price,
    consumptionLPer100Km: consumption,
  });

  const commute = computeCommute({
    oneWayKm: km("commuteDistance"),
    returnTrip: values.commuteReturn,
    daysPerWeek: num("commuteDaysPerWeek") ?? 0,
    weeksPerYear: num("commuteWeeksPerYear") ?? 0,
    consumptionLPer100Km: consumption,
    pricePerLiter: price,
  });

  const comparison = computeComparison({
    annualKm: km("compareAnnualDistance"),
    current: { consumptionLPer100Km: consumption, pricePerLiter: price },
    alternative: {
      consumptionLPer100Km: lPer100Km("compareConsumption"),
      pricePerLiter: perLiter("comparePrice"),
    },
    switchCost: num("compareSwitchCost") ?? 0,
  });

  const detour = computeDetour({
    liters: liters("detourVolume"),
    pricePerLiterHere: price,
    pricePerLiterThere: perLiter("detourPrice"),
    detourKm: km("detourDistance"),
    returnTrip: values.detourReturn,
    consumptionLPer100Km: consumption,
  });

  const reimbursementRatePerKm = ratePerDistanceToPerKm(
    num("reimbursementRate") ?? 0,
    distanceUnit,
  );
  const reimbursement = computeReimbursement({
    distanceKm: trip?.distanceKm ?? 0,
    ratePerKm: reimbursementRatePerKm,
    consumptionLPer100Km: consumption,
    pricePerLiter: price,
  });

  const applyVehicle = (vehicle: CalculatorVehiclePreset) => {
    setValues((current) => {
      const next = { ...current };
      if (vehicle.avgConsumptionLPer100Km != null) {
        next.consumption = String(
          Math.round(
            convertConsumption(
              vehicle.avgConsumptionLPer100Km,
              distanceUnit,
              volumeUnit,
            ).value * 10,
          ) / 10,
        );
      }
      const vehiclePrice =
        vehicle.lastPricePerLiter ?? vehicle.avgPricePerLiter ?? null;
      if (vehiclePrice != null) {
        next.price = String(
          Math.round(pricePerVolumeUnit(vehiclePrice, volumeUnit) * 1000) / 1000,
        );
      }
      if (vehicle.projectedAnnualKm != null && vehicle.projectedAnnualKm > 0) {
        next.compareAnnualDistance = String(
          Math.round(kmToPreferred(vehicle.projectedAnnualKm, distanceUnit)),
        );
      }
      return next;
    });
    setAppliedVehicleId(vehicle.id);
  };

  const usableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.avgConsumptionLPer100Km != null ||
      vehicle.lastPricePerLiter != null ||
      vehicle.avgPricePerLiter != null,
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Result headline — sticks to the top so the answer stays on screen
          while scrolling through the inputs on a phone. */}
      <div className="sticky top-0 z-20">
        <div className="overflow-hidden rounded-2xl border border-accent/25 bg-card shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div className="bg-gradient-to-br from-accent/15 via-accent/5 to-transparent px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("hero.total")}
                </p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
                  {money(trip?.totalCost)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {trip
                    ? t("hero.summary", {
                        distance: dist(trip.distanceKm),
                        volume: vol(trip.liters),
                      })
                    : t("hero.empty")}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("actions.reset")}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-card/70 px-2.5 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("hero.perDistance", { unit: distanceLabel })}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {money(
                    trip
                      ? ratePerKmToPerDistance(trip.costPerKm, distanceUnit)
                      : null,
                    3,
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-card/70 px-2.5 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("hero.volume")}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {vol(trip?.liters)}
                </p>
              </div>
              <div className="rounded-xl bg-card/70 px-2.5 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("hero.perPerson")}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {money(trip?.costPerPassenger)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAllSections(!allOpen)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {allOpen ? t("actions.collapseAll") : t("actions.expandAll")}
        </button>
      </div>

      <div className="space-y-3">
        {/* --- Vehicle presets ------------------------------------------- */}
        <CalculatorSection
          title={t("sections.vehicle.title")}
          hint={t("sections.vehicle.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.vehicle} />}
          open={sections.vehicle}
          onToggle={() => toggleSection("vehicle")}
          summary={
            usableVehicles.length > 0
              ? t("sections.vehicle.summary", { count: usableVehicles.length })
              : undefined
          }
        >
          {usableVehicles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
              {t("sections.vehicle.noData")}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {usableVehicles.map((vehicle) => {
                const vehiclePrice =
                  vehicle.lastPricePerLiter ?? vehicle.avgPricePerLiter;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => applyVehicle(vehicle)}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      appliedVehicleId === vehicle.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:bg-muted/60"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {vehicle.label}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-accent">
                        {appliedVehicleId === vehicle.id
                          ? t("sections.vehicle.applied")
                          : t("sections.vehicle.apply")}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {vehicle.avgConsumptionLPer100Km != null
                        ? `${convertConsumption(vehicle.avgConsumptionLPer100Km, distanceUnit, volumeUnit).value.toFixed(1)} ${consumptionLabel}`
                        : t("sections.vehicle.noConsumption")}
                      {vehiclePrice != null
                        ? ` · ${money(pricePerVolumeUnit(vehiclePrice, volumeUnit), 3)}/${volumeLabel}`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CalculatorSection>

        {/* --- Route planner --------------------------------------------- */}
        <CalculatorSection
          title={t("sections.route.title")}
          hint={t("sections.route.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.route} />}
          open={sections.route}
          onToggle={() => toggleSection("route")}
        >
          <RoutePlanner
            distanceUnit={distanceUnit}
            onDistance={(value) => setValue("distance", value)}
          />
        </CalculatorSection>

        {/* --- Trip ------------------------------------------------------ */}
        <CalculatorSection
          title={t("sections.trip.title")}
          hint={t("sections.trip.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.trip} />}
          open={sections.trip}
          onToggle={() => toggleSection("trip")}
          summary={money(trip?.totalCost)}
        >
          <FieldGrid>
            <NumberField
              id="calc-distance"
              label={t("sections.trip.distance")}
              unit={distanceLabel}
              value={values.distance}
              onChange={(value) => setValue("distance", value)}
            />
            <NumberField
              id="calc-consumption"
              label={t("sections.trip.consumption")}
              unit={consumptionLabel}
              value={values.consumption}
              onChange={(value) => setValue("consumption", value)}
            />
            <NumberField
              id="calc-price"
              label={t("sections.trip.price")}
              unit={priceLabel}
              value={values.price}
              onChange={(value) => setValue("price", value)}
            />
            <NumberField
              id="calc-extra"
              label={t("sections.trip.extraCost")}
              unit={currency}
              value={values.extraCost}
              onChange={(value) => setValue("extraCost", value)}
              placeholder="0"
              hint={t("sections.trip.extraCostHint")}
            />
            <div className="sm:col-span-2">
              <ToggleField
                id="calc-roundtrip"
                label={t("sections.trip.roundTrip")}
                hint={t("sections.trip.roundTripHint")}
                checked={values.roundTrip}
                onChange={(checked) => setValue("roundTrip", checked)}
              />
            </div>
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.trip.fuelCost")}
              value={money(trip?.fuelCost)}
              detail={trip ? vol(trip.liters) : undefined}
            />
            <ResultTile
              label={t("sections.trip.total")}
              value={money(trip?.totalCost)}
              detail={trip ? dist(trip.distanceKm) : undefined}
              tone="accent"
            />
            <ResultTile
              label={t("sections.trip.perDistance", { unit: distanceLabel })}
              value={money(
                trip
                  ? ratePerKmToPerDistance(trip.costPerKm, distanceUnit)
                  : null,
                3,
              )}
              wide
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Split ----------------------------------------------------- */}
        <CalculatorSection
          title={t("sections.split.title")}
          hint={t("sections.split.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.split} />}
          open={sections.split}
          onToggle={() => toggleSection("split")}
          summary={t("sections.split.summary", {
            people: passengers,
            amount: money(trip?.costPerPassenger),
          })}
        >
          <StepperField
            label={t("sections.split.passengers")}
            value={passengers}
            onChange={(value) => setValue("passengers", String(value))}
            max={9}
            decreaseLabel={t("sections.split.decrease")}
            increaseLabel={t("sections.split.increase")}
          />
          <ResultGrid>
            <ResultTile
              label={t("sections.split.perPerson")}
              value={money(trip?.costPerPassenger)}
              tone="accent"
            />
            <ResultTile
              label={t("sections.split.total")}
              value={money(trip?.totalCost)}
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Tank ------------------------------------------------------ */}
        <CalculatorSection
          title={t("sections.tank.title")}
          hint={t("sections.tank.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.tank} />}
          open={sections.tank}
          onToggle={() => toggleSection("tank")}
          summary={money(tank?.refillCost)}
        >
          <FieldGrid>
            <NumberField
              id="calc-tank-size"
              label={t("sections.tank.size")}
              unit={volumeLabel}
              value={values.tankSize}
              onChange={(value) => setValue("tankSize", value)}
            />
            <NumberField
              id="calc-tank-level-number"
              label={t("sections.tank.level")}
              unit="%"
              value={values.tankLevel}
              onChange={(value) => setValue("tankLevel", value)}
              max={100}
            />
            <SliderField
              id="calc-tank-level"
              label={t("sections.tank.levelSlider")}
              value={Math.min(100, Math.max(0, num("tankLevel") ?? 0))}
              onChange={(value) => setValue("tankLevel", String(value))}
              valueLabel={`${Math.round(Math.min(100, Math.max(0, num("tankLevel") ?? 0)))} %`}
            />
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.tank.refillCost")}
              value={money(tank?.refillCost)}
              detail={tank ? vol(tank.missingLiters) : undefined}
              tone="accent"
            />
            <ResultTile
              label={t("sections.tank.fullCost")}
              value={money(tank?.fullTankCost)}
            />
            <ResultTile
              label={t("sections.tank.rangeLeft")}
              value={dist(tank?.remainingRangeKm)}
              detail={tank ? vol(tank.remainingLiters) : undefined}
            />
            <ResultTile
              label={t("sections.tank.rangeFull")}
              value={dist(tank?.fullRangeKm)}
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Budget ---------------------------------------------------- */}
        <CalculatorSection
          title={t("sections.budget.title")}
          hint={t("sections.budget.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.budget} />}
          open={sections.budget}
          onToggle={() => toggleSection("budget")}
          summary={dist(budget?.distanceKm)}
        >
          <FieldGrid>
            <NumberField
              id="calc-budget"
              label={t("sections.budget.amount")}
              unit={currency}
              value={values.budget}
              onChange={(value) => setValue("budget", value)}
            />
          </FieldGrid>
          <ResultGrid>
            <ResultTile
              label={t("sections.budget.volume")}
              value={vol(budget?.liters, 2)}
            />
            <ResultTile
              label={t("sections.budget.distance")}
              value={dist(budget?.distanceKm)}
              tone="accent"
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Commute --------------------------------------------------- */}
        <CalculatorSection
          title={t("sections.commute.title")}
          hint={t("sections.commute.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.commute} />}
          open={sections.commute}
          onToggle={() => toggleSection("commute")}
          summary={t("sections.commute.summary", {
            amount: money(commute?.costPerMonth),
          })}
        >
          <FieldGrid>
            <NumberField
              id="calc-commute-distance"
              label={t("sections.commute.distance")}
              unit={distanceLabel}
              value={values.commuteDistance}
              onChange={(value) => setValue("commuteDistance", value)}
            />
            <NumberField
              id="calc-commute-days"
              label={t("sections.commute.days")}
              value={values.commuteDaysPerWeek}
              onChange={(value) => setValue("commuteDaysPerWeek", value)}
              max={7}
            />
            <NumberField
              id="calc-commute-weeks"
              label={t("sections.commute.weeks")}
              value={values.commuteWeeksPerYear}
              onChange={(value) => setValue("commuteWeeksPerYear", value)}
              hint={t("sections.commute.weeksHint")}
              max={52}
            />
            <div className="flex items-end">
              <ToggleField
                id="calc-commute-return"
                label={t("sections.commute.return")}
                checked={values.commuteReturn}
                onChange={(checked) => setValue("commuteReturn", checked)}
              />
            </div>
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.commute.perDay")}
              value={money(commute?.costPerDay)}
              detail={commute ? dist(commute.dailyKm) : undefined}
            />
            <ResultTile
              label={t("sections.commute.perWeek")}
              value={money(commute?.costPerWeek)}
            />
            <ResultTile
              label={t("sections.commute.perMonth")}
              value={money(commute?.costPerMonth)}
              tone="accent"
            />
            <ResultTile
              label={t("sections.commute.perYear")}
              value={money(commute?.costPerYear)}
              detail={
                commute
                  ? t("sections.commute.perYearDetail", {
                      distance: dist(commute.annualKm),
                      volume: vol(commute.annualLiters, 0),
                    })
                  : undefined
              }
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Comparison ------------------------------------------------ */}
        <CalculatorSection
          title={t("sections.compare.title")}
          hint={t("sections.compare.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.compare} />}
          open={sections.compare}
          onToggle={() => toggleSection("compare")}
          summary={
            comparison
              ? comparison.annualSaving >= 0
                ? t("sections.compare.summarySaves", {
                    amount: money(Math.abs(comparison.annualSaving)),
                  })
                : t("sections.compare.summaryCosts", {
                    amount: money(Math.abs(comparison.annualSaving)),
                  })
              : undefined
          }
        >
          <FieldGrid>
            <NumberField
              id="calc-compare-annual"
              label={t("sections.compare.annualDistance")}
              unit={distanceLabel}
              value={values.compareAnnualDistance}
              onChange={(value) => setValue("compareAnnualDistance", value)}
            />
            <NumberField
              id="calc-compare-consumption"
              label={t("sections.compare.consumption")}
              unit={consumptionLabel}
              value={values.compareConsumption}
              onChange={(value) => setValue("compareConsumption", value)}
            />
            <NumberField
              id="calc-compare-price"
              label={t("sections.compare.price")}
              unit={priceLabel}
              value={values.comparePrice}
              onChange={(value) => setValue("comparePrice", value)}
            />
            <NumberField
              id="calc-compare-switch"
              label={t("sections.compare.switchCost")}
              unit={currency}
              value={values.compareSwitchCost}
              onChange={(value) => setValue("compareSwitchCost", value)}
              placeholder="0"
              hint={t("sections.compare.switchCostHint")}
            />
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.compare.currentCost")}
              value={money(comparison?.currentAnnualCost)}
            />
            <ResultTile
              label={t("sections.compare.alternativeCost")}
              value={money(comparison?.alternativeAnnualCost)}
            />
            <ResultTile
              label={
                comparison && comparison.annualSaving < 0
                  ? t("sections.compare.extraPerYear")
                  : t("sections.compare.savingPerYear")
              }
              value={money(
                comparison ? Math.abs(comparison.annualSaving) : null,
              )}
              detail={
                comparison
                  ? t("sections.compare.perMonth", {
                      amount: money(Math.abs(comparison.monthlySaving)),
                    })
                  : undefined
              }
              tone={
                comparison
                  ? comparison.annualSaving >= 0
                    ? "positive"
                    : "negative"
                  : "neutral"
              }
            />
            <ResultTile
              label={t("sections.compare.breakEven")}
              value={
                comparison?.breakEvenKm != null
                  ? dist(comparison.breakEvenKm)
                  : "—"
              }
              detail={
                comparison?.breakEvenYears != null
                  ? t("sections.compare.breakEvenYears", {
                      years: comparison.breakEvenYears.toFixed(1),
                    })
                  : t("sections.compare.breakEvenNone")
              }
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Detour ---------------------------------------------------- */}
        <CalculatorSection
          title={t("sections.detour.title")}
          hint={t("sections.detour.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.detour} />}
          open={sections.detour}
          onToggle={() => toggleSection("detour")}
          summary={
            detour
              ? detour.worthIt
                ? t("sections.detour.summaryWorth", {
                    amount: money(detour.netSaving),
                  })
                : t("sections.detour.summaryNotWorth")
              : undefined
          }
        >
          <FieldGrid>
            <NumberField
              id="calc-detour-volume"
              label={t("sections.detour.volume")}
              unit={volumeLabel}
              value={values.detourVolume}
              onChange={(value) => setValue("detourVolume", value)}
            />
            <NumberField
              id="calc-detour-price"
              label={t("sections.detour.price")}
              unit={priceLabel}
              value={values.detourPrice}
              onChange={(value) => setValue("detourPrice", value)}
              hint={t("sections.detour.priceHint", {
                price: money(pricePerVolumeUnit(price, volumeUnit), 3),
              })}
            />
            <NumberField
              id="calc-detour-distance"
              label={t("sections.detour.distance")}
              unit={distanceLabel}
              value={values.detourDistance}
              onChange={(value) => setValue("detourDistance", value)}
            />
            <div className="flex items-end">
              <ToggleField
                id="calc-detour-return"
                label={t("sections.detour.return")}
                checked={values.detourReturn}
                onChange={(checked) => setValue("detourReturn", checked)}
              />
            </div>
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.detour.grossSaving")}
              value={money(detour?.grossSaving)}
            />
            <ResultTile
              label={t("sections.detour.detourCost")}
              value={money(detour?.detourCost)}
              detail={detour ? dist(detour.detourKm) : undefined}
            />
            <ResultTile
              label={t("sections.detour.netSaving")}
              value={money(detour?.netSaving)}
              detail={
                detour
                  ? detour.worthIt
                    ? t("sections.detour.worthIt")
                    : t("sections.detour.notWorthIt")
                  : undefined
              }
              tone={detour ? (detour.worthIt ? "positive" : "negative") : "neutral"}
              wide
            />
          </ResultGrid>
        </CalculatorSection>

        {/* --- Reimbursement --------------------------------------------- */}
        <CalculatorSection
          title={t("sections.reimbursement.title")}
          hint={t("sections.reimbursement.hint")}
          icon={<Icon path={SECTION_ICON_PATHS.reimbursement} />}
          open={sections.reimbursement}
          onToggle={() => toggleSection("reimbursement")}
          summary={money(reimbursement?.difference)}
        >
          <FieldGrid>
            <NumberField
              id="calc-reimbursement-rate"
              label={t("sections.reimbursement.rate")}
              unit={`${currency}/${distanceLabel}`}
              value={values.reimbursementRate}
              onChange={(value) => setValue("reimbursementRate", value)}
              hint={t("sections.reimbursement.distanceHint", {
                distance: dist(trip?.distanceKm),
              })}
            />
          </FieldGrid>

          <ResultGrid>
            <ResultTile
              label={t("sections.reimbursement.payout")}
              value={money(reimbursement?.payout)}
            />
            <ResultTile
              label={t("sections.reimbursement.fuelCost")}
              value={money(reimbursement?.fuelCost)}
            />
            <ResultTile
              label={t("sections.reimbursement.difference")}
              value={money(reimbursement?.difference)}
              detail={
                reimbursement
                  ? t("sections.reimbursement.breakEven", {
                      rate: money(
                        ratePerKmToPerDistance(
                          reimbursement.breakEvenRatePerKm,
                          distanceUnit,
                        ),
                        3,
                      ),
                      unit: distanceLabel,
                    })
                  : undefined
              }
              tone={
                reimbursement
                  ? reimbursement.difference >= 0
                    ? "positive"
                    : "negative"
                  : "neutral"
              }
              wide
            />
          </ResultGrid>
        </CalculatorSection>
      </div>
    </div>
  );
}

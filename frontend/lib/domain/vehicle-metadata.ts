import type { Prisma } from "@prisma/client";

export type VehicleMetadata = {
  color?: string | null;
};

export function parseVehicleMetadata(
  value: Prisma.JsonValue | null,
): VehicleMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    color: typeof record.color === "string" ? record.color : null,
  };
}

export function buildVehicleMetadata(color?: string | null): Prisma.InputJsonValue {
  const trimmed = color?.trim();
  if (!trimmed) {
    return {};
  }
  return { color: trimmed };
}

import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  findExpenseForOwner,
  listExpensesForOwner,
  serializeExpense,
  type SerializedExpense,
} from "@/lib/repositories/expenses";
import { findVehicleById } from "@/lib/repositories/vehicles";
import { notifyExpenseAdded } from "@/lib/services/notifications";
import type { CreateExpenseInput } from "@/lib/validations/expense";

export async function getExpensesPageData(
  vehicleId?: string,
): Promise<{ expenses: SerializedExpense[] }> {
  const ownerUserId = await getCurrentUserId();
  const rows = await listExpensesForOwner(ownerUserId, vehicleId);
  return { expenses: rows.map(serializeExpense) };
}

export async function createExpense(input: CreateExpenseInput) {
  const ownerUserId = await getCurrentUserId();
  const vehicle = await findVehicleById(input.vehicleId, ownerUserId);
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");

  const expense = await createExpenseRecord({
    vehicleId: input.vehicleId,
    category: input.category,
    occurredAt: new Date(input.occurredAt),
    amountCents: BigInt(input.amountCents ?? 0),
    currency: input.currency ?? "EUR",
    odometerKm: input.odometerKm,
    maintenanceRecordId: input.maintenanceRecordId,
    description: input.description,
    createdByUserId: ownerUserId,
  });

  void notifyExpenseAdded(ownerUserId, expense);

  return expense.id;
}

export async function deleteExpense(expenseId: string) {
  const ownerUserId = await getCurrentUserId();
  const deleted = await deleteExpenseRecord(expenseId, ownerUserId);
  if (!deleted) throw new Error("EXPENSE_NOT_FOUND");
}

export async function createExpenseFromMaintenance(input: {
  vehicleId: string;
  occurredAt: Date;
  amountCents: number;
  currency: string;
  odometerKm?: number | null;
  maintenanceRecordId: string;
  description?: string | null;
}) {
  const ownerUserId = await getCurrentUserId();
  if (input.amountCents <= 0) return null;

  const expense = await createExpenseRecord({
    vehicleId: input.vehicleId,
    category: "MAINTENANCE",
    occurredAt: input.occurredAt,
    amountCents: BigInt(input.amountCents),
    currency: input.currency,
    odometerKm: input.odometerKm,
    maintenanceRecordId: input.maintenanceRecordId,
    description: input.description,
    createdByUserId: ownerUserId,
  });

  void notifyExpenseAdded(ownerUserId, expense);
  return expense.id;
}

export { findExpenseForOwner };

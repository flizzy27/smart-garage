"use server";

import { revalidatePath } from "next/cache";
import { createExpense, deleteExpense } from "@/lib/services/expenses";
import { createExpenseSchema } from "@/lib/validations/expense";

export type ExpenseActionResult = {
  ok: boolean;
  error?: string;
};

export async function createExpenseAction(
  _prev: ExpenseActionResult | null,
  formData: FormData,
): Promise<ExpenseActionResult> {
  try {
    const parsed = createExpenseSchema.parse({
      vehicleId: formData.get("vehicleId"),
      category: formData.get("category"),
      occurredAt: formData.get("occurredAt"),
      amountCents: formData.get("amountEuros") || undefined,
      currency: formData.get("currency") || undefined,
      odometerKm: formData.get("odometerKm") || undefined,
      description: formData.get("description") || undefined,
    });

    await createExpense(parsed);
    revalidatePath("/expenses");
    revalidatePath("/");
    revalidatePath(`/vehicles/${parsed.vehicleId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}

export async function deleteExpenseAction(
  _prev: ExpenseActionResult | null,
  formData: FormData,
): Promise<ExpenseActionResult> {
  try {
    const expenseId = String(formData.get("expenseId") ?? "");
    await deleteExpense(expenseId);
    revalidatePath("/expenses");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete expense",
    };
  }
}

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";

export type ApiUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/** Returns 401 JSON when the session cookie is missing or invalid. */
export async function requireApiUser(): Promise<ApiUserResult> {
  try {
    const userId = await getCurrentUserId();
    return { ok: true, userId };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

export type PushoverMessage = {
  userKey: string;
  appToken: string;
  message: string;
  title?: string;
  priority?: -2 | -1 | 0 | 1 | 2;
  url?: string;
};

export async function sendPushoverNotification(
  payload: PushoverMessage,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    token: payload.appToken,
    user: payload.userKey,
    message: payload.message,
  });

  if (payload.title) body.set("title", payload.title);
  if (payload.priority != null) body.set("priority", String(payload.priority));
  if (payload.url) body.set("url", payload.url);

  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as { status?: number; errors?: string[] };

  if (!res.ok || data.status !== 1) {
    return {
      ok: false,
      error: data.errors?.join(", ") ?? `Pushover error ${res.status}`,
    };
  }

  return { ok: true };
}

export async function validatePushoverUser(
  userKey: string,
  appToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = new URLSearchParams({ token: appToken, user: userKey });
  const res = await fetch("https://api.pushover.net/1/users/validate.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as { status?: number; errors?: string[] };

  if (!res.ok || data.status !== 1) {
    return {
      ok: false,
      error: data.errors?.join(", ") ?? "Invalid Pushover user key",
    };
  }

  return { ok: true };
}

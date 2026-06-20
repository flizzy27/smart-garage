export type TelegramMessage = {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown";
};

export async function sendTelegramNotification(
  payload: TelegramMessage,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://api.telegram.org/bot${payload.botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: payload.chatId,
      text: payload.text,
      parse_mode: payload.parseMode ?? "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    description?: string;
  };

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.description ?? `Telegram error ${res.status}`,
    };
  }

  return { ok: true };
}

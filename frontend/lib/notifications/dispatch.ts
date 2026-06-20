import { sendPushoverNotification } from "@/lib/notifications/pushover";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import type { NotificationSettingsRecord } from "@/lib/repositories/notifications";

export type NotificationPayload = {
  title: string;
  message: string;
  telegramHtml?: string;
  priority?: -2 | -1 | 0 | 1 | 2;
};

export type DispatchResult = {
  sentChannels: ("pushover" | "telegram")[];
  errors: string[];
};

export function getEnabledChannels(settings: NotificationSettingsRecord) {
  const channels: ("pushover" | "telegram")[] = [];

  if (
    settings.pushoverEnabled &&
    settings.pushoverUserKey &&
    settings.pushoverAppToken
  ) {
    channels.push("pushover");
  }

  if (
    settings.telegramEnabled &&
    settings.telegramBotToken &&
    settings.telegramChatId
  ) {
    channels.push("telegram");
  }

  return channels;
}

export async function dispatchToEnabledChannels(
  settings: NotificationSettingsRecord,
  payload: NotificationPayload,
): Promise<DispatchResult> {
  const sentChannels: ("pushover" | "telegram")[] = [];
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  if (
    settings.pushoverEnabled &&
    settings.pushoverUserKey &&
    settings.pushoverAppToken
  ) {
    tasks.push(
      sendPushoverNotification({
        userKey: settings.pushoverUserKey,
        appToken: settings.pushoverAppToken,
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
      }).then((result) => {
        if (result.ok) {
          sentChannels.push("pushover");
        } else {
          errors.push(`Pushover: ${result.error}`);
        }
      }),
    );
  }

  if (
    settings.telegramEnabled &&
    settings.telegramBotToken &&
    settings.telegramChatId
  ) {
    tasks.push(
      sendTelegramNotification({
        botToken: settings.telegramBotToken,
        chatId: settings.telegramChatId,
        text: payload.telegramHtml ?? payload.message,
      }).then((result) => {
        if (result.ok) {
          sentChannels.push("telegram");
        } else {
          errors.push(`Telegram: ${result.error}`);
        }
      }),
    );
  }

  await Promise.all(tasks);

  return { sentChannels, errors };
}

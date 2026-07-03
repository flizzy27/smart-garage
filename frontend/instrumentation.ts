const TICK_INTERVAL_MS = 15 * 60 * 1000;

let workerHandle: NodeJS.Timeout | null = null;
let workerRunning = false;

async function notificationTick() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const { runMaintenanceAlertsForAllUsers } = await import(
      "@/lib/services/notifications"
    );
    await runMaintenanceAlertsForAllUsers();
  } catch {
    // Never let the background worker crash the process.
  } finally {
    workerRunning = false;
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (workerHandle) return;

  const startDelayMs = Number(process.env.NOTIFICATION_WORKER_START_DELAY_MS ?? 30_000);
  workerHandle = setTimeout(() => {
    void notificationTick();
    workerHandle = setInterval(() => {
      void notificationTick();
    }, TICK_INTERVAL_MS);
  }, Number.isFinite(startDelayMs) ? startDelayMs : 30_000);

  workerHandle.unref?.();
}
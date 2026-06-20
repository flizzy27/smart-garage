function isSqliteLockError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("database is locked") ||
    message.includes("sqlite_busy") ||
    message.includes("socket timeout")
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries = 4,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isSqliteLockError(error) || attempt === retries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  throw lastError;
}

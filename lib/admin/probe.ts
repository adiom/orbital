import "server-only";

/**
 * One failed sensor, surfaced to the station instead of killing the screen.
 */
export type Failure = { source: string; message: string };

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Collects aggregates where a single broken query degrades its own panel
 * rather than collapsing the whole response.
 *
 * Every probe logs its name, row count and duration, so a 500 in the browser
 * can be traced to one query in the server log without bisecting by hand.
 */
export function createProbe(scope: string) {
  const failures: Failure[] = [];

  async function probe<T>(
    source: string,
    run: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    const startedAt = Date.now();

    try {
      const result = await run();
      const rows = Array.isArray(result) ? result.length : 1;
      console.log(
        `[${scope}] ${source} ok rows=${rows} ${Date.now() - startedAt}ms`
      );
      return result;
    } catch (error) {
      failures.push({ source, message: errorMessage(error) });
      console.error(
        `[${scope}] ${source} failed after ${Date.now() - startedAt}ms:`,
        error
      );
      return fallback;
    }
  }

  return { probe, failures };
}

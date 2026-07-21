/** Safely read JSON from a fetch Response; never throws on HTML/plain-text bodies. */
export async function readJsonBody<T = unknown>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, error: "Empty response from server." };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    if (/an error occurred/i.test(text) || /<!doctype html/i.test(text)) {
      return {
        ok: false,
        error:
          "The server hit a temporary error while saving. Please try again in a moment.",
      };
    }
    return {
      ok: false,
      error: "Unexpected server response. Please try again.",
    };
  }
}

export function friendlyStorageClientError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (
    /fetch failed|failed to fetch|networkerror|load failed|unexpected token|not valid json|an error occurred|empty response/i.test(
      message,
    )
  ) {
    return "Could not reach storage just now. Please try again in a moment.";
  }
  return message || fallback;
}

export function truncateForStorage(value: string | undefined, max: number) {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

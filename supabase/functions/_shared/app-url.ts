const DEFAULT_APP_URL = "https://depan.pro";

/**
 * Base URL of the frontend for the current environment.
 * Server-side only: never derived from a browser-provided origin.
 */
export function getAppBaseUrl(): string {
  const raw = Deno.env.get("FRONTEND_URL")?.trim() || DEFAULT_APP_URL;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return DEFAULT_APP_URL;
    return parsed.origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

/** Canonical login URL for welcome/login emails. */
export function buildLoginUrl(): string {
  return `${getAppBaseUrl()}/auth`;
}

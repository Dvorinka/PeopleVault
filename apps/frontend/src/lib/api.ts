import { createApiClient, type ApiClient } from "@peoplevault/api-client";

const baseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Singleton typed API client. All HTTP calls go through this — never raw fetch.
 * Cookie-based sessions: credentials are included so the session cookie is sent.
 */
export const api: ApiClient = createApiClient(baseUrl);

/**
 * Extract a human-readable error message from an openapi-fetch response.
 */
export function apiError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { error?: string; message?: string; detail?: string };
    if (typeof e.error === "string") return e.error;
    if (typeof e.message === "string") return e.message;
    if (typeof e.detail === "string") return e.detail;
  }
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}

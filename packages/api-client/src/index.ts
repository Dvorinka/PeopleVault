/**
 * Typed API client for PeopleVault, generated from the OpenAPI spec.
 * Never hand-duplicate API types in the frontend — import from here.
 */
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/schema";

export type { paths, components } from "./generated/schema";

export interface CreateApiClientOptions {
  baseUrl: string;
  /** Send cookies (session) with every request. Defaults to "include". */
  credentials?: RequestCredentials;
  /** Optional middleware (e.g. auth, logging). */
  middleware?: Middleware[];
}

export function createApiClient(options: CreateApiClientOptions): ReturnType<typeof createClient<paths>>;
export function createApiClient(baseUrl: string): ReturnType<typeof createClient<paths>>;
export function createApiClient(
  optionsOrBaseUrl: CreateApiClientOptions | string,
): ReturnType<typeof createClient<paths>> {
  const opts: CreateApiClientOptions =
    typeof optionsOrBaseUrl === "string"
      ? { baseUrl: optionsOrBaseUrl }
      : optionsOrBaseUrl;

  const client = createClient<paths>({
    baseUrl: opts.baseUrl,
    credentials: opts.credentials ?? "include",
  });

  if (opts.middleware) {
    for (const m of opts.middleware) {
      client.use(m);
    }
  }
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

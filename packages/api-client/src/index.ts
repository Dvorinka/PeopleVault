/**
 * Typed API client for PeopleVault, generated from the OpenAPI spec.
 * Never hand-duplicate API types in the frontend — import from here.
 */
import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

export type { paths, components } from "./generated/schema";

export function createApiClient(baseUrl: string) {
  const client = createClient<paths>({ baseUrl });
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

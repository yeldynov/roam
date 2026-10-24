// Read-only access to Roam's public Sanity dataset over the query CDN. No token: never add one here,
// this file ships in the app bundle.
const PROJECT_ID = "crc5fllu";
const DATASET = "production";
const API_VERSION = "2026-10-21";

/**
 * Runs a GROQ query; values always go in `params` (sent as $name=<JSON>), never into the query string.
 * `cdn: false` reads the live API instead, for the few screens that must show a write at once (host edits).
 */
export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}, signal?: AbortSignal, cdn = true): Promise<T> {
  const search = new URLSearchParams({ query });
  for (const [key, value] of Object.entries(params)) search.set(`$${key}`, JSON.stringify(value));
  const host = cdn ? "apicdn" : "api";
  const res = await fetch(`https://${PROJECT_ID}.${host}.sanity.io/v${API_VERSION}/data/query/${DATASET}?${search}`, { signal });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result as T;
}

/** A Sanity CDN image at a display width, in the best format the device accepts */
export const imageUrl = (url: string, width: number) => `${url}?w=${width}&auto=format`;

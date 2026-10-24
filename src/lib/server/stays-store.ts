// Server only: holds the Sanity write token for host edits to published stays. Import from `src/app/api/**` alone.
// Plain fetch like bookings-store.ts, against api.sanity.io (uncached) so ownership and revisions are current.
import { EDITABLE_FIELDS, type StayPatch } from "@/lib/host";

const API = "https://crc5fllu.api.sanity.io/v2026-10-21/data";
const auth = { Authorization: `Bearer ${process.env.SANITY_API_WRITE_TOKEN}` };

/** The stay's current revision when the company owns it through `property.host`; null otherwise (missing or someone else's) */
export async function ownedStayRev(stayId: string, orgId: string): Promise<string | null> {
  const search = new URLSearchParams({
    query: `*[_type == "property" && _id == $id && host->clerkOrgId == $orgId][0]._rev`,
    $id: JSON.stringify(stayId),
    $orgId: JSON.stringify(orgId),
  });
  const res = await fetch(`${API}/query/production?${search}`, { headers: auth });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result ?? null;
}

/**
 * Sets fields on the published stay, only if it's still at `rev`. Returns the editable fields after the write,
 * or "conflict" when someone saved in between.
 * ponytail: patches the published document only; a Studio draft of the same stay overwrites this when published.
 */
export async function patchStay(stayId: string, rev: string, set: StayPatch): Promise<StayPatch | "conflict"> {
  const res = await fetch(`${API}/mutate/production?returnDocuments=true&visibility=sync`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ patch: { id: stayId, ifRevisionID: rev, set } }] }),
  });
  if (res.status === 409) return "conflict";
  if (!res.ok) throw new Error(`Sanity mutate failed: ${res.status}`);
  const doc = ((await res.json()) as { results: { document: Record<string, unknown> }[] }).results[0].document;
  return Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, doc[k]])) as StayPatch;
}

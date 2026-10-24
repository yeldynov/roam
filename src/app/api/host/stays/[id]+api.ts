import { validateStayPatch } from "@/lib/host";
import { authOrg, forbidden, unauthorized } from "@/lib/server/auth";
import { ownedStayRev, patchStay } from "@/lib/server/stays-store";

/** A host team member edits typed fields of one of their company's stays. Goes live on the published stay. */
export async function PATCH(request: Request, { id }: { id: string }) {
  const caller = await authOrg(request);
  if (!caller) return unauthorized();
  if (!caller.orgId || !caller.canEditStays) return forbidden();

  const result = validateStayPatch(await request.json().catch(() => null));
  if ("errors" in result) return Response.json({ errors: result.errors }, { status: 400 });

  // Same 404 for a missing stay and another company's, so the route never reveals who owns what
  const rev = await ownedStayRev(id, caller.orgId);
  if (!rev) return Response.json({ error: "not_found" }, { status: 404 });

  const stay = await patchStay(id, rev, result.set);
  if (stay === "conflict") return Response.json({ error: "conflict" }, { status: 409 });
  return Response.json({ stay });
}

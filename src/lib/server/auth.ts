// Server only: holds the Clerk secret key. Import from `src/app/api/**` alone, never from app code.
import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

/**
 * The signed-in guest's Clerk user ID from `Authorization: Bearer <session token>`, or null.
 * Verified offline with CLERK_JWT_KEY. No `authorizedParties`: native session tokens carry no web origin.
 */
export async function authUserId(request: Request): Promise<string | null> {
  const state = await clerk.authenticateRequest(request, { jwtKey: process.env.CLERK_JWT_KEY });
  return state.isAuthenticated ? state.toAuth().userId : null;
}

/**
 * The caller and their active host company, or null when not signed in. `orgId` is null for guests.
 * Checks the custom `org:stays:edit` permission: Clerk's `org:sys_*` permissions aren't in session claims.
 */
export async function authOrg(request: Request) {
  const state = await clerk.authenticateRequest(request, { jwtKey: process.env.CLERK_JWT_KEY });
  if (!state.isAuthenticated) return null;
  const auth = state.toAuth();
  return { userId: auth.userId, orgId: auth.orgId ?? null, orgRole: auth.orgRole ?? null, canEditStays: auth.has({ permission: "org:stays:edit" }) };
}

export const forbidden = () => Response.json({ error: "forbidden" }, { status: 403 });

export const unauthorized =() => Response.json({ error: "unauthorized" }, { status: 401 });

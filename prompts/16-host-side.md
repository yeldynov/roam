# 16 · Host side

Status: done

> Updated after approval: booking (`15-booking-flow.md`) already added `@clerk/backend`, `web.output: "server"`, EAS Hosting, `src/lib/server/auth.ts`, and `apiFetch`. This plan reuses them instead of adding them. No decision changed.

## Goal

A host company's team signs in to Roam, opens Hosting from Profile, sees the company's stays, and edits their typed fields (price, guests, pets, amenities, check-in/out, house rules). Admins invite and remove teammates. Guests see edits within about a minute.

## Decisions

- **Company = Clerk Organization.** Organizations are turned on with `force_organization_selection: false` (membership optional), so guests never see a company step. Patch with `npx clerk@latest config patch` (dry run first): `organization_settings.enabled: true`, `force_organization_selection: false`, `max_allowed_memberships: 20` (the Hobby cap; dev is 5 today), `creator_role: "org:admin"`. Membership required is Clerk's default when turning orgs on, so check that it isn't set.
- **Onboarding is Roam-invite only.** There is no create-company UI. Roam staff create the org and invite the first admin with the Clerk CLI, then paste the org ID into the Sanity `host` document:
  ```bash
  npx clerk@latest api -X POST /v1/organizations -d '{"name":"<Company>","created_by":"<roam staff user_id>","max_allowed_memberships":20}'
  npx clerk@latest api -X POST /v1/organizations/<org_id>/invitations -d '{"email_address":"<admin email>","role":"org:admin","inviter_user_id":"<roam staff user_id>"}'
  ```
  The staff creator then leaves the org: `DELETE /v1/organizations/<org_id>/memberships/<user_id>`.
- **Roles: `org:admin` and `org:member` only** (Clerk Hobby, free). There is one custom permission, `org:stays:edit`, assigned to both roles; it's the permission API routes check, because Clerk's `org:sys_*` permissions aren't in session claims. Admins also hold `org:sys_memberships:manage` (Clerk default), which gates the team screen. Custom roles need Clerk's B2B add-on ($100/mo) and are out of scope.
- **Ownership:** a new field `host.clerkOrgId` (string, optional, `rule.regex(/^org_[A-Za-z0-9]+$/)`, unique across hosts by a custom rule, description "Clerk organization that manages this host's stays"). It's editable in Studio, since staff link it by hand. A stay belongs to a company when `property.host->clerkOrgId == orgId`. There's no per-stay assignment: every member can edit every stay of the company. The field isn't in the embeddings projection, and that doesn't change.
- **Reads are public** through the existing `sanityFetch` (CDN, no token). There's one new query, `*[_type == "property" && host->clerkOrgId == $orgId] | order(title asc)`, with card fields plus the editable fields. The org ID isn't secret.
- **Writes go through one API route,** `src/app/api/host/stays/[id]+api.ts` (`PATCH`). In order:
  1. Authenticate with a new `authOrg(request)` in `src/lib/server/auth.ts`. It uses the same `clerk.authenticateRequest` (offline with `CLERK_JWT_KEY`) as `authUserId` and returns `{ userId, orgId, orgRole, canEditStays }` from `toAuth()`. Reject with 401 if not signed in. Reject with 403 if `orgId` is missing or `!has({ permission: "org:stays:edit" })`.
  2. Validate the body with `validateStayPatch` (below). Reject with 400 and per-field messages.
  3. Fetch `*[_id == $id && host->clerkOrgId == $orgId][0]{_id, _rev}` from `api.sanity.io` (not apicdn) with the write token. Return 404 if there's no match, and never say whether the stay exists for someone else.
  4. Mutate with plain `fetch` to `/data/mutate/production`: `patch: { id, ifRevisionID: _rev, set }`. A revision conflict returns 409 "This stay just changed. Reload and try again."
  5. Return the updated editable fields.

  The app calls it through `apiFetch` (`src/lib/booking-api.ts`) with `await getToken()`. Sanity query and mutate for `production` live in a new server-only `src/lib/server/stays-store.ts`, following `bookings-store.ts`.
- **Editable fields and rules** (mirroring `studio/schemaTypes/property.ts`), in a pure `src/lib/host.ts` (`validateStayPatch(body) → { set } | { errors }`, no UI imports, checked by `npx tsx src/lib/host.check.ts`):
  - `nightlyPrice`: integer ≥ 1
  - `maxGuests`: integer 1–16
  - `petsAllowed`: boolean
  - `amenities`: unique values from `AMENITIES` in `src/lib/search.ts`
  - `checkInTime` / `checkOutTime`: `HH:MM` 24-hour
  - `houseRules`: up to 20 trimmed non-empty strings of at most 200 characters (a server guard the schema doesn't have)

  Unknown keys are rejected. Hosts never write `title`, `description`, `tags`, `photos`, `location`, `rating`, `reviewCount`, `cancellationPolicy`, or `host`.
- **Edits go live immediately** (they patch the published document). Description isn't regenerated automatically: staff re-run `write-copy` after host edits (`--check` reports stale copy). A Studio draft of the same stay would overwrite host edits when published. That's acceptable for now (`ponytail:` comment at the mutate; patch drafts too if staff start editing alongside hosts).
- **Active company:** host screens call `setActive({ organization })` on enter. With one membership it's automatic; with several, `host/index` first shows a company picker (`useOrganizationList({ userMemberships: true })`). Guest screens ignore the active org.
- **Invitations:** invite emails link to Clerk's Account Portal. The invitee signs up or in to Roam with that email. Profile shows each pending invitation (`useOrganizationList({ userInvitations: true })`) as a row "Join <company>"; accepting it (`invitation.accept()`) then opens Hosting. There are no deep links.
- **Screens** (root Stack, signed-in group, `headerShown: true` with native back). No design is attached, so they use existing `src/components/ui` components and tokens only, with no new tokens:
  - Profile: a "Hosting" `ListGroup` with a "Hosting" menu row (`Building2` icon), shown only when the user has at least one membership, plus pending-invitation rows.
  - `host/index`: company name (`title`), then the company's stays as `ListRow`s (cover thumbnail, title, `$price · city`). There's a "Team" row for everyone; members see it read-only. Loading, error with retry, and empty ("No stays linked to <company> yet. Contact Roam support.") states.
  - `host/stay/[id]`: a form with `Input`s for price and max guests, a `Switch` for pets, `Chip`s for amenities, `Input`s for check-in/out, and a house-rules list (add, edit, remove rows). "Save" is disabled until something changes. On success it shows the toast "Saved. Guests see changes within a minute." and keeps the returned values (the CDN lags). Field errors show under each field; 409, 403, and network errors show an `Alert`.
  - `host/team`: members (name, email, role) from `useOrganization({ memberships: true })` and pending invitations (`invitations: true`). Admins get an "Invite" email field with an Admin/Member role chip (`organization.inviteMember`), revoke on pending invites, and per-member remove (`membership.destroy()`) and role change (`membership.update`). They can't remove or demote themselves when they're the last admin. Clerk enforces permissions server-side; the UI hides actions without `has({ permission: "org:sys_memberships:manage" })`.
- **Hosting:** existing setup (`web.output: "server"`, EAS Hosting). No changes, and no new dependency.
- **Secrets:** a new `SANITY_API_WRITE_TOKEN` (Editor token, project `crc5fllu`; kept separate from `SANITY_BOOKINGS_TOKEN`) lives only in `src/lib/server/stays-store.ts`, `.env.local`, and EAS env with "sensitive" visibility. Never `EXPO_PUBLIC_`.
- **Analytics:**
  - `host_mode_entered`: `org_id`, `org_role`
  - `host_stay_updated` (after a 200 response): `stay_id`, `fields_changed` (key names only), `org_id`, `org_role`
  - `host_stay_update_failed`: `status`, `org_id`
  - `host_member_invited`: `role`
  - `host_invitation_accepted`: `org_id`

  Never send emails, names, prices, rule text, or tokens. No PostHog Group Analytics (paid).

## Out of scope

- Creating stays.
- Photos.
- Editing title, description, location, or cancellation policy.
- A self-serve "become a host" flow.
- Custom roles or limiting members to some stays.
- Clerk-hosted org components (web only).
- Deep-link invitation acceptance.
- Bookings, calendar, and payouts.
- Automatically regenerating copy after an edit.
- A separate host app or web dashboard.

## Steps

### 1. Clerk and Sanity setup

- **Clerk:**
  - Patch the Organizations settings from Decisions with `npx clerk@latest config patch --dry-run`, then for real.
  - Create the custom permission `org:stays:edit` and add it to `org:admin` and `org:member`. Use the CLI config if the schema exposes it (`npx clerk@latest config schema --keys organization_settings`); otherwise list it under "You need to" for the Dashboard (Organizations → Roles & Permissions).
- **Sanity:**
  - Add `clerkOrgId` to `studio/schemaTypes/host.ts` as described. The custom uniqueness rule uses `getClient({apiVersion: '2025-02-19'})`.
  - Run `npx sanity schema validate`, `npx sanity@latest schema deploy`, and `npx sanity@latest deploy` from `studio/`.

Done when: `npx clerk@latest config pull` shows `enabled: true` and `force_organization_selection: false`, and the deployed schema (Sanity MCP `get_schema`) has `host.clerkOrgId`.

### 2. Validation module

Create `src/lib/host.ts` with `EDITABLE_FIELDS`, `StayPatch`, and `validateStayPatch` as described, importing `AMENITIES` from `src/lib/search.ts`. Add `src/lib/host.check.ts` (asserts, same style as `search.check.ts`) covering:

- a valid full patch;
- each field's bad values (0 price, 17 guests, `"9:00"`, unknown amenity, duplicate amenity, 21 rules, an empty rule);
- an unknown key;
- an empty body.

Done when: `npx tsx src/lib/host.check.ts` passes.

### 3. API route and hosting

- Add `authOrg` to `src/lib/server/auth.ts`.
- Add `src/lib/server/stays-store.ts` (`ownedStayRev`, `patchStay`).
- Create `src/app/api/host/stays/[id]+api.ts` (`PATCH` only) following Decisions.
- Add `SANITY_API_WRITE_TOKEN=` to `.env.example`.

Done when the route returns each of these locally:

- 401 without a token;
- 403 for a guest token;
- 404 for another company's stay;
- 400 for a bad body;
- 200 for a valid edit, after which the published document in Sanity has the new value.

Test with `curl` and a token printed from a dev screen or `npx clerk@latest` session tooling.

### 4. Host screens

- Add the Hosting group and invitation rows to `src/app/(tabs)/profile.tsx`. Plan 14 is editing this file, so build on its current version.
- Add `src/app/host/index.tsx`, `src/app/host/stay/[id].tsx`, and `src/app/host/team.tsx`, registered in the signed-in `Stack.Protected` in `src/app/_layout.tsx`.
- Add `useHostStays(orgId)` to `src/lib/stays.ts` using the public query from Decisions.
- Add a `saveStay(id, patch, getToken)` helper in `src/lib/host.ts` that calls the route through `fetch("/api/host/stays/" + id)`. Expo Router resolves the origin on native.
- Add the analytics events.

Done when: a member edits a stay's price and the stay screen shows it after a reload a minute later; an admin invites, revokes, and removes; a member sees the team read-only.

### 5. Link a real host and deploy

- Link one seeded host (e.g. Maya Torres, 6 stays) through the CLI commands in Decisions, using the user's second email as the admin.
- Add `SANITY_API_WRITE_TOKEN` to EAS env with "sensitive" visibility, then redeploy.

Done when: the deployed route answers the same as locally from a development or Expo Go build pointing at it.

## Verification

- `npx expo lint`, `npx tsc --noEmit`, `npx tsx src/lib/host.check.ts`, `npx tsx src/lib/search.check.ts`, and `npx tsx src/lib/ask.check.ts` pass.
- API route cases from step 3, locally and deployed. Also:
  - a revision conflict gives 409 (edit the same stay in Studio between load and save);
  - a member token on another company's stay gives 404.
- **Guest unaffected:** a user with no membership signs in with no company prompt, Profile shows no Hosting group, and search, stay, and ask work as before.
- **Invitation flow:** a new email is invited → signs up in Roam → the Profile shows "Join <company>" → accepting it opens Hosting with the company's stays.
- **Roles:** a member can't see the invite and remove controls, and a direct `inviteMember` call from a member session is rejected by Clerk. Promoting the member to admin shows the controls after `session.reload()`.
- **Edit reaches guests:** change the house rules on a stay, then within about a minute the stay screen and the Ask chat ("House rules" chip) show the new text word for word.
- **Screens:** the loading, error (airplane mode), and empty (a company with no linked host) states on `host/index` and `host/team`.
- **PostHog:** `host_stay_updated` arrives with `fields_changed` names only and no values. Check with `posthog:exec` on recent events.
- **On the iPhone:** check every host screen through iPhone Mirroring. No design is attached, so check consistency with the existing screens.
- **Success metric:** the share of linked companies with at least one `host_stay_updated` within 30 days of `host_invitation_accepted` (baseline 0; all edits go through Studio today). Failure signals:
  - `host_stay_update_failed` rate above 5%;
  - invitations pending after 7 days;
  - staff still editing linked stays in Studio.

## AGENTS.md updates

- **Expo:** add the host screens (`host/index`, `host/stay/[id]`, `host/team`) and the Profile Hosting entry. `web.output` is `server`, and API routes deploy with EAS Hosting (`origin` on the expo-router plugin).
- **Who owns what:**
  - **Auth:** host companies are Clerk Organizations (membership optional, Roam-invite only, Admin and Member plus the custom permission `org:stays:edit`). Org UI is custom screens on `useOrganization` and `useOrganizationList`, since Clerk's org components are web only.
  - **Content model:** `host.clerkOrgId` links a host to its company, and stays belong to a company through `property.host`.
  - **Writes:** host edits go through `PATCH /api/host/stays/[id]` with `SANITY_API_WRITE_TOKEN`, typed fields only (`src/lib/host.ts`).
  - **Stay copy:** after host edits, re-run `write-copy`, since the description doesn't regenerate on its own.
- **Analytics:** add the host events and their properties.
- **Rules:** add `SANITY_API_WRITE_TOKEN` to the secret list. API routes verify the session with `@clerk/backend` `authenticateRequest`.

## Result

Built on the development instance and checked on the iPhone with the test account. The account is admin of "Maya Torres Stays" (`org_3L8XYJzHLMR3RpemKDQdOlCnK5Y`, linked to the Maya Torres host, 6 stays) and of an unlinked "Roam Test Other Co" (`org_3L8XYbw9iHdVlltKdaPsmPJa7q6`), which exercises the company picker.

- **Clerk:** Organizations on (membership optional, 20 members max). `org:stays:edit` was created through `POST /v1/organization_permissions` and attached to both roles.
- **Sanity:** `host.clerkOrgId` deployed with Studio. A new `SANITY_API_WRITE_TOKEN` Editor token is in `.env.local`.
- **API route:** returns 401 without a token, 403 for a user with no company, 404 for a missing stay and for another company's stay, 400 with per-field messages, and 200 with the published stay updated. A stale revision gives 409 from Sanity, which the route maps to 409.
- **On the phone:** Profile Hosting → picker → stays list → Pine A-Frame price 189 → 199 saved (Sanity showed 199; restored to 189 afterwards) → Team screen with the admin invite form.
- **PostHog:** `host_stay_updated` arrived with `fields_changed: ["nightlyPrice"]` only.
- **Not verified:**
  - the invite → sign up → accept flow (needs a second account);
  - a member's read-only team view;
  - the deployed route (needs `SANITY_API_WRITE_TOKEN` in EAS env and a deploy);
  - the production Clerk instance (orgs and the permission aren't set up there yet).
- **Deviation:** stay rows use the `Home` icon instead of a cover thumbnail, since `ListRow` takes only a lucide icon.

// Server only: holds the Sanity token for the private `bookings` dataset. Import from `src/app/api/**` alone.
// Plain fetch like src/lib/sanity.ts, but against api.sanity.io (uncached) so prices and holds are current.
import { nightDates, nightLockId, type BookingRequest } from "@/lib/booking";

const API = "https://crc5fllu.api.sanity.io/v2026-10-21/data";
// Read per call: EAS Hosting may not have filled process.env when the module loads
const auth = () => ({ Authorization: `Bearer ${process.env.SANITY_BOOKINGS_TOKEN}` });

export type BookingStatus = "pending" | "confirmed" | "expired";

export type BookingDoc = {
  _id: string;
  _type: "booking";
  stayId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  nightlyPrice: number;
  totalCents: number;
  currency: "usd";
  status: BookingStatus;
  paymentIntentId: string;
  expiresAt: string;
  confirmedAt?: string;
};

type Mutation = Record<string, unknown>;

async function query<T>(dataset: "bookings" | "production", groq: string, params: Record<string, unknown> = {}): Promise<T> {
  const search = new URLSearchParams({ query: groq });
  for (const [key, value] of Object.entries(params)) search.set(`$${key}`, JSON.stringify(value));
  // The token is sent for production reads too: harmless, and it skips the public rate limit
  const res = await fetch(`${API}/query/${dataset}?${search}`, { headers: auth() });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result as T;
}

/** One request is one transaction: every mutation applies, or none. 409 means a `create` hit an existing ID. */
async function mutate(mutations: Mutation[]): Promise<{ ok: true; ids: string[] } | { ok: false; status: number }> {
  const res = await fetch(`${API}/mutate/bookings?returnIds=true&visibility=sync`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  });
  if (res.status === 409) return { ok: false, status: 409 };
  if (!res.ok) throw new Error(`Sanity mutate failed: ${res.status}`);
  const { results } = (await res.json()) as { results: { id: string }[] };
  return { ok: true, ids: results.map((r) => r.id) };
}

/** What pricing needs from a published stay; null when it doesn't exist */
export const fetchStayForBooking = (stayId: string) =>
  query<{ nightlyPrice: number; maxGuests: number; title: string } | null>(
    "production",
    `*[_type == "property" && _id == $id][0]{ nightlyPrice, maxGuests, title }`,
    { id: stayId },
  );

/**
 * Creates the pending booking and one lock per night in one transaction.
 * Returns the booking ID, or null when any night is already held.
 */
export async function holdNights(
  req: BookingRequest,
  fields: Pick<BookingDoc, "guestId" | "nights" | "nightlyPrice" | "totalCents" | "paymentIntentId" | "expiresAt">,
): Promise<string | null> {
  const booking = { _type: "booking", ...req, ...fields, currency: "usd", status: "pending" };
  const nights = nightDates(req.checkIn, req.checkOut).map((date) => ({
    create: { _id: nightLockId(req.stayId, date), _type: "night", stayId: req.stayId, date, paymentIntentId: fields.paymentIntentId },
  }));
  const result = await mutate([{ create: booking }, ...nights]);
  // Results don't keep mutation order; the booking's is the one generated ID
  return result.ok ? (result.ids.find((id) => !id.startsWith("night.")) ?? null) : null;
}

/** Who holds these nights: each holder's payment intent with its booking's guest, status and expiry */
export const nightHolders = (req: BookingRequest) =>
  query<{ paymentIntentId: string; guestId: string | null; status: BookingStatus | null; expiresAt: string | null }[]>(
    "bookings",
    `*[_type == "night" && _id in $ids]{
      paymentIntentId,
      ...*[_type == "booking" && paymentIntentId == ^.paymentIntentId][0]{ guestId, status, expiresAt }
    }`,
    { ids: nightDates(req.checkIn, req.checkOut).map((d) => nightLockId(req.stayId, d)) },
  );

/** Frees a hold whose payment can no longer succeed: deletes its nights and marks it expired */
export async function releaseHold(paymentIntentId: string) {
  const [booking, nightIds] = await Promise.all([
    findBookingByIntent(paymentIntentId),
    query<string[]>("bookings", `*[_type == "night" && paymentIntentId == $pi]._id`, { pi: paymentIntentId }),
  ]);
  const mutations: Mutation[] = nightIds.map((id) => ({ delete: { id } }));
  if (booking && booking.status === "pending") mutations.push({ patch: { id: booking._id, set: { status: "expired" } } });
  if (mutations.length) await mutate(mutations);
}

export const findBookingByIntent = (paymentIntentId: string) =>
  query<BookingDoc | null>("bookings", `*[_type == "booking" && paymentIntentId == $pi][0]`, { pi: paymentIntentId });

/** Marks a paid booking confirmed. Safe to repeat. */
export async function confirmBooking(paymentIntentId: string) {
  const booking = await findBookingByIntent(paymentIntentId);
  if (!booking || booking.status === "confirmed") return booking;
  await mutate([{ patch: { id: booking._id, set: { status: "confirmed", confirmedAt: new Date().toISOString() } } }]);
  return booking;
}

/** A guest's own booking status; null when it isn't theirs or doesn't exist */
export const bookingStatus = (id: string, guestId: string) =>
  query<{ id: string; status: BookingStatus } | null>(
    "bookings",
    `*[_type == "booking" && _id == $id && guestId == $guestId][0]{ "id": _id, status }`,
    { id, guestId },
  );

export type Trip = {
  id: string;
  stayId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalCents: number;
  stay: { title: string; location: string; image: string } | null;
};

/** A guest's confirmed bookings by check-in, each with the stay's card fields from production */
export async function confirmedTrips(guestId: string): Promise<Trip[]> {
  const bookings = await query<Omit<Trip, "stay">[]>(
    "bookings",
    `*[_type == "booking" && guestId == $guestId && status == "confirmed"] | order(checkIn asc){
      "id": _id, stayId, checkIn, checkOut, guests, nights, totalCents
    }`,
    { guestId },
  );
  const stays = await query<{ id: string; title: string; location: string; image: string }[]>(
    "production",
    `*[_type == "property" && _id in $ids]{ "id": _id, title, "location": location.city + ", " + location.region, "image": photos[0].asset->url }`,
    { ids: [...new Set(bookings.map((b) => b.stayId))] },
  );
  return bookings.map((b) => {
    const stay = stays.find((s) => s.id === b.stayId);
    return { ...b, stay: stay ? { title: stay.title, location: stay.location, image: stay.image } : null };
  });
}

import { HOLD_MINUTES, nightsBetween, priceBooking, toDateString, validateBooking, type BookingRequest } from "@/lib/booking";
import { authUserId, unauthorized } from "@/lib/server/auth";
import { confirmedTrips, fetchStayForBooking, holdNights, nightHolders, releaseHold } from "@/lib/server/bookings-store";
import { stripe } from "@/lib/server/stripe";

const fail = (status: number, reason: string) => Response.json({ reason }, { status });

/** Prices the stay, holds its nights, and returns a PaymentIntent for the guest to pay */
export async function POST(request: Request) {
  const guestId = await authUserId(request);
  if (!guestId) return unauthorized();

  const body = (await request.json().catch(() => null)) as Partial<BookingRequest> | null;
  if (typeof body?.stayId !== "string" || typeof body.checkIn !== "string" || typeof body.checkOut !== "string" || typeof body.guests !== "number") {
    return fail(400, "invalid_dates");
  }
  const req: BookingRequest = { stayId: body.stayId, checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests };

  const stay = await fetchStayForBooking(req.stayId);
  if (!stay) return fail(404, "not_found");
  const problem = validateBooking(req, stay, toDateString(new Date()));
  if (problem) return fail(400, problem);

  const price = priceBooking(nightsBetween(req.checkIn, req.checkOut), stay.nightlyPrice);
  // No payment_method_types: Stripe picks methods from the Dashboard settings
  const intent = await stripe().paymentIntents.create({
    amount: price.totalCents,
    currency: "usd",
    description: `${stay.title}, ${price.nights} night${price.nights === 1 ? "" : "s"}`,
    metadata: { stay_id: req.stayId, guest_id: guestId, check_in: req.checkIn, check_out: req.checkOut },
  });
  const fields = {
    guestId,
    nights: price.nights,
    nightlyPrice: price.nightlyPrice,
    totalCents: price.totalCents,
    paymentIntentId: intent.id,
    expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
  };

  let bookingId = await holdNights(req, fields);
  if (!bookingId && (await releaseStaleHolds(req, guestId))) bookingId = await holdNights(req, fields);
  if (!bookingId) {
    await stripe().paymentIntents.cancel(intent.id);
    return fail(409, "unavailable");
  }

  return Response.json({ bookingId, clientSecret: intent.client_secret, ...price });
}

/** The guest's confirmed bookings, for Trips */
export async function GET(request: Request) {
  const guestId = await authUserId(request);
  if (!guestId) return unauthorized();
  return Response.json({ trips: await confirmedTrips(guestId) });
}

/**
 * Frees nights held by unpaid bookings that are expired or the same guest's earlier attempt (they
 * closed the payment sheet and changed their mind). A hold is released only once its PaymentIntent is
 * cancelled, so nobody can pay for nights someone else now holds. True if everything in the way was freed.
 */
async function releaseStaleHolds(req: BookingRequest, guestId: string) {
  const now = Date.now();
  const holders = await nightHolders(req);
  const stale = [
    ...new Set(
      holders
        .filter((h) => h.status !== "confirmed" && (h.guestId === guestId || !h.expiresAt || Date.parse(h.expiresAt) < now))
        .map((h) => h.paymentIntentId),
    ),
  ];
  // Every holder must be releasable, or the retry would fail anyway
  if (!stale.length || stale.length < new Set(holders.map((h) => h.paymentIntentId)).size) return false;

  for (const id of stale) {
    const intent = await stripe().paymentIntents.retrieve(id);
    if (intent.status !== "canceled") {
      if (intent.status === "succeeded" || intent.status === "processing") return false;
      // Fails if the guest is paying right now; then the nights stay theirs
      const cancelled = await stripe().paymentIntents.cancel(id).then(
        () => true,
        () => false,
      );
      if (!cancelled) return false;
    }
    await releaseHold(id);
  }
  return true;
}

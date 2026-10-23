import type Stripe from "stripe";

import { confirmBooking, releaseHold } from "@/lib/server/bookings-store";
import { constructWebhookEvent } from "@/lib/server/stripe";

// The only place a booking becomes confirmed. Verified by Stripe's signature, not a Clerk session.
export async function POST(request: Request) {
  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(await request.text(), request.headers.get("stripe-signature") ?? "");
  } catch {
    return Response.json({ error: "bad_signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") await confirmBooking(event.data.object.id);
  if (event.type === "payment_intent.canceled") await releaseHold(event.data.object.id);

  return Response.json({ received: true });
}

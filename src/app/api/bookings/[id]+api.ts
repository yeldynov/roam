import { authUserId, unauthorized } from "@/lib/server/auth";
import { bookingStatus } from "@/lib/server/bookings-store";

/** Status of one of the guest's own bookings; the app polls it after paying until the webhook confirms */
export async function GET(request: Request, { id }: { id: string }) {
  const guestId = await authUserId(request);
  if (!guestId) return unauthorized();
  const booking = await bookingStatus(id, guestId);
  return booking ? Response.json(booking) : Response.json({ error: "not_found" }, { status: 404 });
}

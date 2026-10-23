// Booking dates, validation, and price. Pure: the app uses it for its estimate, API routes for the real charge.

export const MAX_NIGHTS = 28;
/** How long a pending booking holds its nights before another guest may take them */
export const HOLD_MINUTES = 15;

export type BookingRequest = { stayId: string; checkIn: string; checkOut: string; guests: number };
export type BookingProblem = "invalid_dates" | "too_many_guests";

const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Midnight UTC of a `YYYY-MM-DD` date, or NaN when it isn't a real calendar date */
function dayMs(date: string) {
  if (!DATE.test(date)) return NaN;
  const ms = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(date) ? ms : NaN;
}

/** `YYYY-MM-DD` of a Date in UTC (stays have no timezone, so UTC is the calendar) */
export const toDateString = (d: Date) => d.toISOString().slice(0, 10);

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day a local Date falls on, as `YYYY-MM-DD` (what a guest picked or sees as today) */
export const localDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local noon of a `YYYY-MM-DD` date, for pickers that work in local time */
export function localDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** "Tue, Dec 1" */
export const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export const addDays =(date: string, days: number) => toDateString(new Date(dayMs(date) + days * DAY));

export const nightsBetween = (checkIn: string, checkOut: string) => Math.round((dayMs(checkOut) - dayMs(checkIn)) / DAY);

/** Every night slept: check-in up to, not including, check-out */
export const nightDates = (checkIn: string, checkOut: string) =>
  Array.from({ length: nightsBetween(checkIn, checkOut) }, (_, i) => addDays(checkIn, i));

/** null when the request can be booked, else why not */
export function validateBooking(
  req: Pick<BookingRequest, "checkIn" | "checkOut" | "guests">,
  stay: { maxGuests: number },
  today: string,
): BookingProblem | null {
  const nights = nightsBetween(req.checkIn, req.checkOut);
  if (!(dayMs(req.checkIn) >= dayMs(today)) || !(nights >= 1 && nights <= MAX_NIGHTS)) return "invalid_dates";
  if (!Number.isInteger(req.guests) || req.guests < 1 || req.guests > stay.maxGuests) return "too_many_guests";
  return null;
}

export function priceBooking(nights: number, nightlyPrice: number) {
  const total = nights * nightlyPrice;
  return { nights, nightlyPrice, total, totalCents: total * 100 };
}

/** Fixed ID that makes a night bookable once: creating it fails if it exists */
export const nightLockId = (stayId: string, date: string) => `night.${stayId}.${date}`;

export const BOOKING_PROBLEM_TEXT: Record<BookingProblem | "unavailable", string> = {
  invalid_dates: `Pick a check-in from today and a stay of 1 to ${MAX_NIGHTS} nights.`,
  too_many_guests: "That's more guests than this stay sleeps.",
  unavailable: "Those dates were just booked. Try other dates.",
};

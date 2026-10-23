// npx tsx src/lib/booking.check.ts
import assert from "node:assert/strict";

import { addDays, nightDates, nightLockId, nightsBetween, priceBooking, validateBooking } from "./booking";

const stay = { maxGuests: 4 };
const today = "2026-10-23";

assert.equal(nightsBetween("2026-10-30", "2026-11-02"), 3);
assert.deepEqual(nightDates("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01"]);
assert.deepEqual(nightDates("2028-02-28", "2028-03-01"), ["2028-02-28", "2028-02-29"]);
assert.equal(addDays("2026-12-31", 1), "2027-01-01");

assert.equal(validateBooking({ checkIn: today, checkOut: "2026-10-24", guests: 1 }, stay, today), null);
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-11-21", guests: 4 }, stay, today), null); // 28 nights
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-11-22", guests: 1 }, stay, today), "invalid_dates"); // 29
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-10-24", guests: 1 }, stay, today), "invalid_dates");
assert.equal(validateBooking({ checkIn: "2026-10-22", checkOut: "2026-10-24", guests: 1 }, stay, today), "invalid_dates");
assert.equal(validateBooking({ checkIn: "2027-02-29", checkOut: "2027-03-02", guests: 1 }, stay, today), "invalid_dates");
assert.equal(validateBooking({ checkIn: "10/24/2026", checkOut: "2026-10-26", guests: 1 }, stay, today), "invalid_dates");
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-10-26", guests: 5 }, stay, today), "too_many_guests");
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-10-26", guests: 0 }, stay, today), "too_many_guests");
assert.equal(validateBooking({ checkIn: "2026-10-24", checkOut: "2026-10-26", guests: 1.5 }, stay, today), "too_many_guests");

assert.deepEqual(priceBooking(3, 245), { nights: 3, nightlyPrice: 245, total: 735, totalCents: 73500 });
assert.equal(nightLockId("abc", "2026-10-30"), "night.abc.2026-10-30");

console.log("booking checks passed");

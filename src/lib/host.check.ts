// npx tsx src/lib/host.check.ts
import assert from "node:assert/strict";

import { changedFields, validateStayPatch } from "./host";

const full = {
  nightlyPrice: 245,
  maxGuests: 16,
  petsAllowed: true,
  amenities: ["hotTub", "wifi"],
  checkInTime: "15:00",
  checkOutTime: "09:30",
  houseRules: ["  No parties  ", "Quiet after 22:00"],
};
assert.deepEqual(validateStayPatch(full), { set: { ...full, houseRules: ["No parties", "Quiet after 22:00"] } });
assert.deepEqual(validateStayPatch({ houseRules: [] }), { set: { houseRules: [] } });

const errorKeys = (body: unknown) => {
  const r = validateStayPatch(body);
  return "errors" in r ? Object.keys(r.errors) : [];
};
assert.deepEqual(errorKeys({ nightlyPrice: 0 }), ["nightlyPrice"]);
assert.deepEqual(errorKeys({ nightlyPrice: 99.5 }), ["nightlyPrice"]);
assert.deepEqual(errorKeys({ nightlyPrice: "245" }), ["nightlyPrice"]);
assert.deepEqual(errorKeys({ maxGuests: 17 }), ["maxGuests"]);
assert.deepEqual(errorKeys({ maxGuests: 0 }), ["maxGuests"]);
assert.deepEqual(errorKeys({ petsAllowed: "yes" }), ["petsAllowed"]);
assert.deepEqual(errorKeys({ checkInTime: "9:00" }), ["checkInTime"]);
assert.deepEqual(errorKeys({ checkOutTime: "24:00" }), ["checkOutTime"]);
assert.deepEqual(errorKeys({ amenities: ["sauna"] }), ["amenities"]);
assert.deepEqual(errorKeys({ amenities: ["wifi", "wifi"] }), ["amenities"]);
assert.deepEqual(errorKeys({ houseRules: Array(21).fill("Rule") }), ["houseRules"]);
assert.deepEqual(errorKeys({ houseRules: ["   "] }), ["houseRules"]);
assert.deepEqual(errorKeys({ houseRules: ["x".repeat(201)] }), ["houseRules"]);
assert.deepEqual(errorKeys({ title: "New name" }), ["body"]);
assert.deepEqual(errorKeys({ nightlyPrice: 200, description: "x" }), ["body"]);
assert.deepEqual(errorKeys({}), ["body"]);
assert.deepEqual(errorKeys(null), ["body"]);
assert.deepEqual(errorKeys([1]), ["body"]);
assert.deepEqual(errorKeys({ nightlyPrice: -1, maxGuests: 99 }), ["nightlyPrice", "maxGuests"]);

assert.deepEqual(changedFields(full, { ...full, nightlyPrice: 250, amenities: ["wifi", "hotTub"] }), ["nightlyPrice", "amenities"]);
assert.deepEqual(changedFields(full, { ...full }), []);

console.log("host checks passed");

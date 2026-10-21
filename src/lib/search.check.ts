// Run: npx tsx src/lib/search.check.ts
import { PROPERTIES } from "../data/properties";
import { searchStays } from "./search";

function assert(ok: unknown, message = "assertion failed"): asserts ok {
  if (!ok) throw new Error(message);
}

const ids = (q: string) => searchStays(q, PROPERTIES).map((s) => s.id);

const sentence = searchStays("quiet pet friendly cabin with a hot tub under $300 a night", PROPERTIES);
assert(sentence.length > 0);
assert(sentence.every((s) => s.petsAllowed && s.price <= 300));
assert(sentence[0].id === "lake-arrowhead-cabin", "cabin first");

assert(["beach", "villa"].includes(searchStays("beach villa", PROPERTIES)[0].category));
assert(searchStays("dogs below 200", PROPERTIES).every((s) => s.petsAllowed && s.price <= 200));
assert(ids("zzz").length === 0, "no match");
assert(ids("").length === PROPERTIES.length, "empty shows all");

console.log("search ok");

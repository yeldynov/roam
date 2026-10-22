// Run: npx tsx src/lib/search.check.ts
import { buildSearchQuery, emptyFilters, parseQuery } from "./search";

function assert(ok: unknown, message = "assertion failed"): asserts ok {
  if (!ok) throw new Error(message);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The seeded stays' places, as the meta query returns them
const PLACES = ["Big Bear Lake", "Lake Arrowhead", "Brooklyn", "Montepulciano", "Miami Beach", "CA", "NY", "OR", "HI", "Tuscany", "Porto", "United States", "Italy", "Portugal"];
const meta = { places: PLACES, freeCancellationIds: ["flex", "moderate"] };

const cabins = parseQuery("Cabins in California under $300", PLACES);
assert(same(cabins.types, ["cabin"]) && cabins.place === "CA" && cabins.maxPrice === 300 && cabins.soft.length === 0, "cabins in california");

const sentence = parseQuery("quiet pet friendly cabin with a hot tub under $300 a night", PLACES);
assert(sentence.pets && same(sentence.amenities, ["hotTub"]) && sentence.maxPrice === 300, "pets, hot tub, price");
assert(same(sentence.types, ["cabin"]) && same(sentence.soft, ["quiet"]), `soft only quiet: ${sentence.soft}`);

const villa = parseQuery("beachfront villa for 6 guests with 3 bedrooms", PLACES);
assert(same(villa.settings, ["beach"]) && same(villa.types, ["villa"]) && villa.guests === 6 && villa.bedrooms === 3, "villa");

const tuscany = parseQuery("free cancellation in Tuscany", PLACES);
assert(tuscany.freeCancellation && tuscany.place === "Tuscany" && tuscany.soft.length === 0, "tuscany");

// Places win over settings; short codes only in capitals
assert(parseQuery("cozy spot near Big Bear Lake", PLACES).place === "Big Bear Lake", "longest place");
assert(same(parseQuery("Miami Beach studio", PLACES).settings, []), "Miami Beach is a place, not a setting");
assert(parseQuery("cabin or cottage", PLACES).place === undefined, "'or' is not Oregon");
assert(parseQuery("cabin in OR", PLACES).place === "OR", "OR in capitals is Oregon");
assert(parseQuery("family of four", PLACES).guests === 4, "word numbers");
assert(parseQuery("250 per night", PLACES).maxPrice === 250, "price without $");

// Values go in params; only active clauses appear
const built = buildSearchQuery(sentence, "best", meta);
assert(!built.query.includes("300") && !built.query.includes("hotTub") && !built.query.includes("quiet"), "no values in the query");
assert(built.params.maxPrice === 300 && built.params.soft === "quiet" && built.query.includes("semanticSimilarity($soft)"), "params");
assert(!built.query.includes("$guests") && !built.query.includes("$place"), "inactive clauses left out");
assert(same(buildSearchQuery({ ...emptyFilters(), freeCancellation: true }, "best", meta).params.freeIds, ["flex", "moderate"]), "free cancellation ids");
assert(!buildSearchQuery(emptyFilters(), "best", meta).query.includes("score("), "no soft words, no scoring");
assert(buildSearchQuery(sentence, "priceAsc", meta).query.includes("order(nightlyPrice asc"), "price sort skips scoring");

console.log("search ok");

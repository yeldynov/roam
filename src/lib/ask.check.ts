// Run: npx tsx src/lib/ask.check.ts
import { answerCards, TOPICS, topicsFor } from "./ask";

function assert(ok: unknown, message = "assertion failed"): asserts ok {
  if (!ok) throw new Error(message);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

for (const t of TOPICS) assert(same(topicsFor(t.question), [t.id]), `chip question maps to ${t.id}: ${topicsFor(t.question)}`);
assert(same(topicsFor("can I bring my dog and when is check in"), ["checkIn", "pets"]), "two topics");
assert(same(topicsFor("hello"), []), "no topic");

const stay = {
  cancellationPolicy: { title: "Strict cancellation", summary: null, freeCancellationHours: 0, body: "No refunds." },
  checkInTime: "16:00",
  checkOutTime: "10:00",
  petsAllowed: false,
  houseRules: null,
  policies: [{ kind: "pets", title: "Pets", body: "Service animals are always welcome." }],
};
assert(same(answerCards(["houseRules"], stay), []), "no house rules, no card");
assert(answerCards(["checkIn"], stay).length === 1, "missing Roam checkIn policy is skipped");
const pets = answerCards(["pets"], stay);
assert(pets.length === 2 && pets[0].body === "No pets" && pets[1].body === "Service animals are always welcome.", "pets cards word for word");
assert(answerCards(["cancellation"], stay)[0].body === "No refunds.", "cancellation body word for word");

console.log("ask checks passed");

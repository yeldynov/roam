// Local stand-in for GROQ filters + embeddings. The real search plan replaces this; don't extend it.
import type { Property } from "@/data/properties";

const STOP = new Set(
  "a an and the with for to in on of at by near night nights per stay stays place friendly some under below max less than i we want need looking".split(" "),
);

// Hard filters parsed in code, never guessed: price ceiling and pets
const PRICE = /(?:under|below|max|less than|up to)?\s*\$\s?(\d+)|(?:under|below|max|less than|up to)\s+(\d+)/;
const PETS = /\b(pets?|dogs?|cats?)\b/;

export function searchStays(query: string, stays: Property[]): Property[] {
  let q = query.toLowerCase();
  const price = q.match(PRICE);
  const maxPrice = price ? Number(price[1] ?? price[2]) : undefined;
  if (price) q = q.replace(price[0], " ");
  const pets = PETS.test(q);
  if (pets) q = q.replace(new RegExp(PETS, "g"), " ");

  const words = q.split(/[^a-z0-9-]+/).filter((w) => w.length > 1 && !STOP.has(w));
  return stays
    .filter((s) => (maxPrice === undefined || s.price <= maxPrice) && (!pets || s.petsAllowed))
    .map((s) => {
      const text = [s.title, s.location, s.category, ...s.amenities, ...s.tags].join(" ").toLowerCase();
      // ponytail: substring match ("hot" hits "hot tub"); embeddings replace this ranking
      return { s, score: words.filter((w) => text.includes(w.replace(/s$/, ""))).length };
    })
    .filter(({ score }) => words.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || b.s.rating - a.s.rating)
    .map(({ s }) => s);
}

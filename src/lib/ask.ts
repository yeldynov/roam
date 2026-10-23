import type { StayDetails } from "./stays";

// ponytail: keyword map stands in for Jev's topic Choice until the Ask API route exists
export const TOPICS = [
  { id: "cancellation", label: "Cancellation", question: "What's the cancellation policy?", keywords: ["cancel", "refund"] },
  {
    id: "checkIn",
    label: "Check-in",
    question: "When are check-in and check-out?",
    keywords: ["check-in", "check in", "checkin", "check-out", "check out", "checkout", "arrive", "arrival", "leave", "key"],
  },
  { id: "pets", label: "Pets", question: "Can I bring my pet?", keywords: ["pet", "dog", "cat", "animal"] },
  {
    id: "houseRules",
    label: "House rules",
    question: "What are the house rules?",
    keywords: ["rule", "party", "parties", "smoke", "smoking", "noise", "quiet hours"],
  },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

/** One answer, copied word for word from the stay or Roam's policies */
export type AnswerCard = { source: string; title?: string; body: string };

export const SUPPORT_EMAIL = "yeldynov@gmail.com";

export const NO_ANSWER = "I couldn't find that in this stay's details or Roam's policies. Contact Roam support for help.";

/** Every topic the text mentions, in TOPICS order */
export function topicsFor(text: string): TopicId[] {
  const t = text.toLowerCase();
  return TOPICS.filter((topic) => topic.keywords.some((k) => t.includes(k))).map((topic) => topic.id);
}

type AnswerStay = Pick<StayDetails, "cancellationPolicy" | "checkInTime" | "checkOutTime" | "petsAllowed" | "houseRules" | "policies">;

export function answerCards(topics: TopicId[], stay: AnswerStay): AnswerCard[] {
  const roam = (kind: string): AnswerCard[] =>
    stay.policies.filter((p) => p.kind === kind).map((p) => ({ source: "Roam policy", title: p.title, body: p.body }));

  return topics.flatMap((topic): AnswerCard[] => {
    switch (topic) {
      case "cancellation":
        return [{ source: "Cancellation policy · this stay", title: stay.cancellationPolicy.title, body: stay.cancellationPolicy.body }];
      case "checkIn":
        return [{ source: "This stay", body: `Check-in after ${stay.checkInTime} · Check-out before ${stay.checkOutTime}` }, ...roam("checkIn")];
      case "pets":
        return [{ source: "This stay", body: stay.petsAllowed ? "Pets allowed" : "No pets" }, ...roam("pets")];
      case "houseRules":
        return stay.houseRules?.length ? [{ source: "House rules · this stay", body: stay.houseRules.join("\n\n") }] : [];
    }
  });
}

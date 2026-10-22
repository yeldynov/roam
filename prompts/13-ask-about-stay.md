# 13 · Ask about this stay

Status: done

## Goal

From a stay's details screen, a guest opens "Ask about this stay", taps a topic chip or types a question, and gets back one answer card per matching topic. Each card shows the stay's own fields or Roam's policy text word for word, with a source label. There's no backend yet: a local keyword map picks the topics.

## Decisions

### Answers
- **Design (user choice):** there's no chat image, so the screen is composed from the existing design system (`design.png` tokens and components). Values are picked from tokens, not estimated from an image.
- **Entry (user choice):** "Ask about policies" on the stay screen pushes the chat screen. The policies `InfoSheet` is removed. The cancellation and host sheets stay.
- **Answer text (user choice):** taken from this stay's real data via `useStay(id)`. No Jev, no Context endpoint, no LLM. Topic picking is a pure keyword map that Jev replaces later.
- **Chips (user choice):** Cancellation, Check-in, Pets, House rules. Tapping one sends its question as a guest message, e.g. "What's the cancellation policy?".

### Route and data
- **Route:** move `src/app/stay/[id].tsx` to `src/app/stay/[id]/index.tsx` (`git mv`, no code change) and add `src/app/stay/[id]/ask.tsx`. In the root layout's signed-in `Stack.Protected`, register `stay/[id]/index` and `stay/[id]/ask` in place of `stay/[id]`. The stay screen pushes `{ pathname: "/stay/[id]/ask", params: { id } }`.
- **Data:** the ask screen calls `useStay(id)` again. It's one small CDN read with no new hook. Add `kind` to the `policies` projection and the `StayDetails.policies` type, so topics can find Roam's `pets` and `checkIn` policies by kind instead of by title.
- **Topics:** `src/lib/ask.ts`, pure and importing no UI, checked by `npx tsx src/lib/ask.check.ts` (asserts, like `search.check.ts`):
  - `TOPICS`: `cancellation`, `checkIn`, `pets`, `houseRules`, each with a chip label, the question a chip sends, and lowercase keywords:
    - cancellation: cancel, refund
    - checkIn: check-in, check in, checkin, check-out, check out, checkout, arrive, arrival, leave, key
    - pets: pet, dog, cat, animal
    - houseRules: rule, party, parties, smoke, smoking, noise, quiet hours
  - `topicsFor(text)` returns every topic whose keyword appears in the text, in `TOPICS` order.
  - `answerCards(topics, stay)` returns `{ source, title, body }[]`, one or two cards per topic, with all text copied from the stay:
    - cancellation: the stay's `cancellationPolicy.title`, `body`. Source "Cancellation policy · this stay".
    - checkIn: "Check-in after {checkInTime} · Check-out before {checkOutTime}". Source "This stay". Then the Roam `checkIn` policy's title and body, if it exists. Source "Roam policy".
    - pets: "Pets allowed" or "No pets" from `petsAllowed`. Source "This stay". Then the Roam `pets` policy. Source "Roam policy".
    - houseRules: the rules, one per line. Source "House rules · this stay". If the stay has none, no card.
  - No topic matched, or no cards: the reply is a plain line, "I couldn't find that in this stay's details or Roam's policies. Contact Roam support for help." (rule: say so and point to support).

### Screen
- **Layout:** `bg-surface`, `KeyboardAvoidingView` (`behavior="padding"` on iOS).
  - **Header:** at the safe-area top. `IconButton` `ChevronLeft` (back), then "Ask about this stay" (headline) over the stay title (caption muted, one line).
  - **Messages:** a `ScrollView` (`px-5 gap-4`) that scrolls to the end on each new message.
    - Guest message: right-aligned bubble, `bg-lavender rounded-lg px-4 py-3`, max 80% width, body text.
    - Reply: a left-aligned stack of `AnswerCard`s (`gap-3`). `AnswerCard` lives in `src/components/stays/answer-card.tsx`, styled like the policy card: `bg-canvas rounded-md p-4 gap-2`. It has the source label (caption muted with a `FileText` sm icon), the title (headline, if any), and the body (`Paragraphs`). The no-match reply is plain muted body text.
  - **Sample conversation:** the screen opens with one sample exchange already shown: the guest asks "What's the cancellation policy?", and the reply has that stay's cancellation card.
  - **Composer:** pinned at the bottom with safe-area padding, `border-t border-line px-5 pt-3`.
    - Topic chips: a horizontal row of `Chip size="sm"`. They stay visible after use.
    - `Input`: `icon={MessageCircle}`, placeholder "Ask about this stay", `returnKeyType="send"`. Trailing send `IconButton size="sm"` (`ArrowUp`), disabled while the text is blank. Send appends the guest message and the reply, then clears the field.
- **States:** loading shows the header and a muted "Loading…" line, and the composer is disabled. Error shows `Alert tone="danger"` with "Try again" (`retry`), like the stay screen. Not found shows "This stay isn't available" with Back.

## Out of scope

- Jev topic decisions, the Context endpoint, the API route, and Clerk-verified requests.
- Persisting the conversation (it resets when the screen closes).
- Analytics for questions. Add `stay_question_asked` with `topics` and `trigger` (chip/text) once answers are real.
- Topics beyond the four (payment, damage, conduct).

## Steps

### 1. Topic map and check
Add `kind` to the `policies` projection and type in `src/lib/stays.ts`. Add `src/lib/ask.ts` and `src/lib/ask.check.ts`. The check covers: each chip question maps to its own topic; "can I bring my dog and when is check in" → pets + checkIn; "hello" → none; a stay with no house rules gives no house-rules card; a missing Roam policy kind is skipped. Done when the check, tsc, and lint pass.

### 2. Route move and entry
`git mv` the stay screen into `stay/[id]/index.tsx`, register both routes, swap the policies sheet for a push to `ask`, and add a stub `ask.tsx`. Done when tsc and lint pass and the stay screen still opens from Home.

### 3. Screen
Build `answer-card.tsx` and `ask.tsx` per Decisions. Done when tsc and lint pass.

### 4. Phone check
Check it through iPhone Mirroring: chips, typing, a multi-topic question, no match, the keyboard covering nothing, and back navigation.

## Verification

- `npx tsx src/lib/ask.check.ts`, `npx expo lint`, `npx tsc --noEmit`.
- On the phone, for one flexible and one strict stay:
  - "Ask about policies" opens the screen with the sample exchange.
  - Each chip sends its question and shows the right cards. The text matches an MCP query of the same stay word for word.
  - "can I bring my dog and when is check in" gives 4 cards.
  - "is there parking" gives the support line.
  - The keyboard doesn't cover the input. Back returns to the stay.

## AGENTS.md updates

- Expo/Screens: the stay screen is `stay/[id]/index` with a sibling `stay/[id]/ask`. "Ask about policies" opens `ask` (the policies sheet is gone). It has topic chips (Cancellation, Check-in, Pets, House rules) that send a question, a message input, and replies as one `AnswerCard` per topic with a source label.
- Who owns what/Policy knowledge: until Jev and Context are wired up, `src/lib/ask.ts` picks topics with a keyword map (checked by `ask.check.ts`), and the cards copy the stay's fields and Roam's policies (`policies` now carry `kind`).

## Result

Built as planned: `src/lib/ask.ts` + `ask.check.ts`, `src/components/stays/answer-card.tsx`, `src/app/stay/[id]/ask.tsx`, the stay screen moved to `stay/[id]/index.tsx` with its policies sheet replaced by a push, `kind` added to `useStay`'s policies.

- **Input fix:** on the phone, the send button followed the typed text. The unlabeled `Input` field's `TextInput` lost `flex-1` (its inline `lineHeight` style drops the class), so it's now wrapped in a `flex-1` View. This also affects sign-in, sign-up, the filter sheet, and `/design-system`.
- **Checked on the phone:** the screen, the sample exchange, chips, and a typed house-rules question. **Not re-checked:** the Input fix (skipped by the user).

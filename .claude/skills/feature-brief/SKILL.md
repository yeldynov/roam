---
name: feature-brief
description: Brief a new Roam feature before any code or plan is written. Reads AGENTS.md and the code it touches, checks current docs, explains the problem, data, storage, services, trade-offs, security and privacy, and success metrics, then asks the open questions. Use when the user says "I want to add <feature>" or runs /feature-brief <feature>.
argument-hint: <feature>
---

# Feature brief

Feature: $ARGUMENTS

This covers steps 1 (Understand) and 2 (Ask) of "How we build features" in AGENTS.md. Write no app code and no plan file in this skill. If no feature was given, ask for it first.

## 1. Read

- Read `AGENTS.md` in full. Its decisions win over anything here.
- Find and read the code the feature touches: screens in `src/app/`, hooks and data in `src/lib/`, components in `src/components/`, schema in `studio/schemaTypes/`, API routes in `src/app/api/`. Trace the real flow end to end, not just file names.
- Open an earlier plan in `prompts/` only if this feature builds directly on it.
- Check live state where it matters: the deployed Sanity schema and real documents (Sanity MCP `get_schema`, `query_documents`), existing PostHog events (`posthog:exec`), Clerk config (`npx clerk@latest config`).

## 2. Research current docs

Don't write version-specific APIs from memory. For each API the feature would use:

- Expo / React Native: check the `expo` major in `package.json`, then read `https://docs.expo.dev/versions/v<major>.0.0/` or start from `https://docs.expo.dev/llms.txt`.
- Load the matching skill if one exists (Expo, Clerk, Sanity, Sanity Context, TypeSafe, PostHog).
- Otherwise use Context7, the Sanity MCP `search_docs`/`read_docs`, or web search.
- Note anything that changed from what AGENTS.md or the existing code assumes, with the source link.

## 3. Explain

Reply with these headings, short and concrete, citing files as links:

1. **Problem:** what the guest (or Roam) can't do today and why it matters.
2. **Data:** every field or record needed, its type, and which already exist (name the field) versus new.
3. **Where it lives:** map each piece to an owner from "Who owns what" (Clerk, Sanity, app state, PostHog, API route). Flag anything that would move a responsibility between tools, and any Sanity schema change once content exists: both need the user's approval.
4. **New services or dependencies:** none if possible. Prefer what's installed, then Expo modules. For each one proposed: why existing tools can't do it.
5. **Trade-offs:** for each new service, dependency, or schema change: cost, quota, lock-in, latency, native rebuild (Expo Go vs development build), maintenance. Give the no-new-service alternative and what it gives up.
6. **Security and privacy:** which secrets are involved and where they stay (API routes and local scripts only, never `EXPO_PUBLIC_`), whether API routes verify the Clerk session, what personal data is stored or sent, and what must never reach PostHog (typed text, tokens, personal data).
7. **Measuring success:** the PostHog events and properties to add (following the naming and privacy rules in the Analytics section), the success metric and baseline, and the failure signal. Include AI-quality checks if Jev or embeddings are involved.
8. **Doc changes:** what changed upstream since AGENTS.md was written, if anything. A decision in AGENTS.md that looks wrong is raised here, not changed.

## 4. Ask

Ask the real open decisions (scope, visible behavior, data shape, new services) in one round through the question panel (`AskUserQuestion`): two to four options each, recommended first. List the defaults picked for everything else. Follow up only if the answers raise new questions.

## 5. Hand off

Once answered, continue with step 3 (Plan) of "How we build features": copy `prompts/TEMPLATE.md` to the next `prompts/NN-feature-name.md`, put the answers and defaults under Decisions, the metrics under Verification, then stop and ask for approval before any app code.

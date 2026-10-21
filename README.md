<div align="center">

  <div>
<img src="https://img.shields.io/badge/-React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/-Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
<img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/-NativeWind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<br />
<img src="https://img.shields.io/badge/-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
<img src="https://img.shields.io/badge/-Sanity-F03E2F?style=for-the-badge&logo=sanity&logoColor=white" />
<img src="https://img.shields.io/badge/-PostHog-1D4AFF?style=for-the-badge&logo=posthog&logoColor=white" />
  </div>

  <h3 align="center">Roam</h3>
  <p align="center">An Airbnb-style app where you search for stays in plain English</p>

  <img src="assets/screenshots/onboarding.png" alt="Roam onboarding screen: a lakeside cabin photo with the title Find a stay that fits your story" width="260" />
  <img src="assets/screenshots/home.png" alt="Roam home screen: the title Find your next stay, a one-sentence search field, category chips with Cabins selected, and a featured cabin card" width="260" />
  <img src="assets/screenshots/search.png" alt="Roam search screen: the query cabin returns 3 stays, listed as cards with photo, rating, amenities and nightly price" width="260" />
</div>

## About

Roam is an Airbnb-style app for iOS and Android. There are no filters or dropdowns. You type what you want, say "a quiet cabin with a hot tub that allows dogs, under $300 a night", and the search finds stays that match.

Every listing also has a chat. Ask "can I bring my pet?" and the answer comes from that stay's own policies.

I'm building it with a coding agent: I write a plan first, then add one feature at a time so the codebase stays something I understand. Auth, content, analytics and AI all run on real services.

## Stack

- [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/) for one codebase that runs on iOS and Android.
- [TypeScript](https://www.typescriptlang.org/), which makes agent-written code easier to review.
- [NativeWind](https://www.nativewind.dev/) for Tailwind-style classes in React Native.
- [Clerk](https://clerk.com) for sign-up and sign-in. Saved stays are tied to the user's Clerk account.
- [Sanity](https://www.sanity.io) holds the listings and generates the embeddings for search. Its content is also what the property chat answers from.
- [PostHog](https://posthog.com) for analytics, from a user's first search to the stays they save.

## What it does

- Search for stays by describing them in plain English
- Chat with a listing and get answers based on its policies
- Sign up and sign in
- Browse a feed of stays
- Save stays and find them again later
- Open a stay to see its details, policies and chat
- Track how people use the app with product analytics

## Running it locally

You'll need [Git](https://git-scm.com/), [Node.js](https://nodejs.org/en) and [npm](https://www.npmjs.com/).

Clone the repo:

```bash
git clone https://github.com/yeldynov/roam.git
cd roam
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

EXPO_PUBLIC_SANITY_PROJECT_ID=
EXPO_PUBLIC_SANITY_DATASET=production
EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Password for the roam.demoN+clerk_test@example.com analytics demo accounts
ROAM_DEMO_PASSWORD=

SANITY_CONTEXT_MCP_URL=
SANITY_ORGANIZATION_TOKEN=
SANITY_CONTEXT_KB_URL=

TYPESAFE_AI_API_KEY=
```

Fill in the values from your own [Clerk](https://clerk.com), [Sanity](https://www.sanity.io) and [PostHog](https://posthog.com) accounts.

Start the dev server:

```bash
npx expo start
```

Then scan the QR code with Expo Go on your phone, or press `i` for the iOS Simulator or `a` for the Android emulator.

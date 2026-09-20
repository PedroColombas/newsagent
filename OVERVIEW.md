# Daily — Overview

A mobile-first (iPhone) web app that delivers a **personalised daily news briefing**, tailored
exactly to what each user cares about — with an optional **AI-generated podcast** version of every
brief. Built as a PWA (installable to the home screen), multi-user from day one.

## What it does

The user shapes what appears in their brief, and a backend pipeline compiles it for them each
weekday morning:

1. **Fetch** — each of the user's topics becomes a Perplexity (`sonar-pro`) search for the latest
   developments.
2. **Synthesise** — Claude writes the results into a clean, sectioned report in the user's chosen
   length and tone.
3. **Podcast (optional)** — Claude rewrites the report into a two-person conversation, which OpenAI
   text-to-speech turns into an audio episode with a branded intro.

Results are served back in the app as a native-feeling reader, plus a Spotify-style audio player.

## Key features

- **Deep customisation (the core of the product):**
  - **Topics** — pick genres to browse, choose *subtopics* within them, or add *custom interests* in
    your own words. Subtopics + interests become the sections of your brief (hard cap of 8).
  - **Report mode** — `briefing` (headlines), `standard` (a few paragraphs), or `deep_dive` (long-form).
  - **Voice** — neutral, analytical, conversational, or critical.
  - **Exclusions** and **delivery time** (local-time aware).
- **Weekday cadence** — automatic briefs Mon–Fri; Monday's sweeps up the weekend. "Generate now"
  works on demand any day.
- **First-time catch-up** — a newly-added topic gets a one-off primer; returning after a break opens
  the brief with a "while you were away" recap.
- **Podcast mode** — conversational audio version with chapters, docked mini-player, and full-screen
  expand.
- **History** — every brief is saved and browsable by calendar.
- **Onboarding + coach-marks** — a short setup wizard, and contextual in-app speech-bubble tips that
  teach each screen once.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite PWA (Vercel) |
| Database / auth / storage | Supabase (Postgres + RLS, magic-link + Google auth, private audio bucket) |
| Pipeline / scheduling | Trigger.dev |
| News fetching | Perplexity `sonar-pro` |
| Report + podcast script | Anthropic Claude |
| Text-to-speech | OpenAI `gpt-4o-mini-tts` |

## Status

The full product is built and in user testing: onboarding, preferences, the daily pipeline, report
view, history, and podcast mode all work. **In progress:** subscription billing (Stripe, web-only) —
free weekly / $8 daily / $14 studio tiers, with a 7-day trial.

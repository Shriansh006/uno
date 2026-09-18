# UNO — multiplayer card night, no signup

A serverless, real-time-ish UNO table. Create a room, share a 4-letter code, and
play with friends or bots from any phone or laptop. Built to run entirely on
Vercel: Next.js App Router + route handlers for the game server, and a Redis
store for room state.

## Features

- **Instant rooms** — no accounts, no lobby app. A code and a share link.
- **2–8 players**, playable solo against bots so the table is never empty.
- **Full UNO rules** — Skip, Reverse, +2, Wild, Wild +4, deck reshuffles, scoring
  across rounds to 500, and the **UNO call / catch** mechanic.
- **Turns never stall** — bots move on their own pace, and a player who drops off
  is auto-played after a grace period (and takes control back the moment they return).
- **Poll-based sync** — works on pure serverless functions, no websocket server to host.
- **Looks good** — a felt table, animated card drops, turn glows, toasts, confetti.

## Stack

- Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS v4
- `@upstash/redis` for room state (REST, serverless-friendly)
- Vercel serverless functions for all game logic

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Without any environment variables the app uses an **in-memory store**. That is
perfect for local dev: it lives inside the running dev server and is shared by
everyone hitting that server. It resets when the server restarts, and it will
**not** work across multiple serverless instances, so production needs Redis.

## Deploy to Vercel

1. Push this repo to GitHub and import it at https://vercel.com/new.
2. Add a Redis store so all serverless instances share room state:
   - In the Vercel dashboard: **Storage → Create Database → Upstash Redis**, then
     connect it to this project. Vercel injects `KV_REST_API_URL` and
     `KV_REST_API_TOKEN` automatically.
   - Or create a database at https://upstash.com and set
     `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Project → Settings →
     Environment Variables.
3. Deploy. That's it — no other services required.

To use the production database locally, run `vercel env pull .env.local`.

### Optional env vars

See `.env.example`. The app supports either naming scheme and falls back to
memory when none are set.

## How it works

```
Browser (polls every ~1.2s)
   │  POST /api/room                 create a table
   │  POST /api/room/[code]          join a table
   │  GET  /api/room/[code]?p=...    fetch state (drives bots + presence)
   │  POST /api/room/[code]/action   play / draw / pass / uno / start ...
   ▼
Route handlers ──► lib/engine.ts   (pure, fully-tested rules engine)
   │
   └──► lib/rooms.ts  ──► Redis (Upstash)  or in-memory fallback
```

- **`lib/engine.ts`** is a pure state machine: deck, dealing, turn order, card
  effects, UNO calls, scoring, bot AI. All mutations go through it, so the rules
  live in one place.
- **`lib/rooms.ts`** stores each room as one Redis key with a short-lived
  per-room lock for read-modify-write, so two players acting at once can't
  corrupt the table.
- **Bots are lazy.** Instead of a background worker, each poll asks "does a bot
  (or an idle player) need to move?" and advances exactly one move. This keeps
  everything inside ordinary serverless functions while still feeling alive.
- **Clients never see other hands.** Responses are sanitized to show only your
  cards and everyone else's card counts.

## Tests

The rules engine is covered by a scripted simulation (bot-only games at 2/4/8
players, randomized human-style play, and a deck-integrity check proving no card
is ever duplicated or lost mid-game). Route handlers were smoke-tested for
create/join/start/permissions/leave and error cases.

```bash
npm run check   # eslint + tsc
npm run build   # production build
```

## Rules notes (house rules)

- Wild +4 can be played at any time (the strict color-check rule is a common
  house-rule argument — we skip it).
- If you play down to one card you must hit **UNO!** before someone catches you;
  getting caught costs 2 cards.
- First player to 500 points wins the game; each round the winner scores the
  value of everyone else's remaining cards.

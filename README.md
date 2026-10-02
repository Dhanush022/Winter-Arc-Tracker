# Winter Arc Tracker

A private, social-first discipline tracker for the **Winter Arc**: the 90-day push from **October 1 → December 31, 2026**, where the goal is to better yourself while the world is busy with holidays.

> **Motive:** Most people put self-improvement on pause during the winter. Winter Arc Tracker keeps you accountable when nobody is watching — track habits, sleep, and nutrition daily, and compete with your friends through a live leaderboard.

---

## Features

- **Daily Commitments** — toggle today's habits (workout, steps, water, diet, reading, meditation, sleep on time, productivity, + your custom habits)
- **Streak tracking** — a day counts when you finish at least *half* your habits; protect it with **streak freezes** (limited to 3)
- **Habit Grid** — 90-day view across October / November / December with per-cell toggles and month progress
- **Sleep log** — hours, trend line, daily bar chart, distribution buckets
- **Macro log** — protein / carbs / fat / calories vs your goals, with Today's Split donut, weekly bars, and progress meters
- **Weekly check-ins & monthly reflections** — what went well, biggest lesson, what to improve next month
- **Leaderboard** — a live ranking of all your friends by **Arc Score**, each row clickable to a detail page with averages per user
- **Auth** — Google OAuth + email/password via Supabase; protected routes
- **Design** — dark/orange/grey palette, Geist typeface pairing (body bold tight + mono labels), animated ThreeUI effects (GalleryHeading hero, Sable top dock on desktop, bottom tab bar on mobile)

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | Supabase (Auth, Postgres, RLS) |
| Extras | ThreeUI source-bundled shaders (Canvas 2D / WebGL), custom fonts |
| Package manager | npm |

## Project structure

```
winter-arc-tracker/
├── src/
│   ├── middleware.ts            # Route guard + Supabase session refresh
│   ├── app/                     # Pages: /, /dashboard, /habits, /macros, /sleep,
│   │   ├── leaderboard/         #      /leaderboard, /profile, /user/[userId]
│   │   └── auth/callback/       # OAuth code exchange
│   ├── components/              # Navbar, AuthProvider, LeaderboardList, ...
│   ├── lib/                     # supabase client, types, utils (streak / score / dates)
│   └── shaders/                 # ThreeUI bundles (GalleryHeading, AnimatedTopDock)
├── .env.local                   # Supabase keys (ignored by git)
├── supabase-schema.sql          # Tables, RLS policies, triggers
├── supabase-leaderboard-fix.sql # Migration for public-read policies
└── SETUP-GUIDE.md               # Step-by-step setup & deployment
```

## Getting started

```bash
npm install
# fill in .env.local with your Supabase keys (see SETUP-GUIDE.md)
npm run dev
```

Open **http://localhost:3000**.

### Environment variables

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only key (not used by default) |

> Never commit `.env.local` — it's gitignored already.

### Database

1. Create a Supabase project
2. Run `supabase-schema.sql` in the Supabase SQL editor
3. Run `supabase-leaderboard-fix.sql` (required so friends can see each other's stats / leaderboard)

See `SETUP-GUIDE.md` for the full walkthrough including Google OAuth and Vercel deployment.

## How scoring works

- Every habit has points (Workout/Productivity = 15, everything else = 10; max ~110/day)
- **Arc Score** = habit completion 40% + sleep average 20% + macro adherence 20% + weekly check-ins 20%
- A streak day = at least half your visible habits completed that day

## Deploy

Push to GitHub, import to Vercel, add the same env vars, and update Supabase + Google OAuth redirect URLs with your production domain (detailed steps in `SETUP-GUIDE.md`).

Built for the season nobody sees ❄→🔥

# tagalong

Post the thing you were going to do anyway — a Costco run, an airport Uber, a Spotify family plan — and let people on your campus tag along and split the cost.

SvelteKit 2 · Svelte 5 (runes) · Tailwind 4 · TypeScript. Hack CMU 2026.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # svelte-check (types + template errors)
npm run lint       # prettier + eslint
```

With no `MONGODB_URI` set it runs on an in-memory store with seeded users and activities — fine for local hacking, but everything resets when the process restarts. Log in as `mei@andrew.cmu.edu` / `tagalong` (every seeded account uses that password), or sign up.

To run against MongoDB locally, copy `.env.example` to `.env` and fill in `MONGODB_URI`. An empty database is seeded with the same demo data on first connect. Data survives hot reloads but resets when the dev server restarts.

## Where things live

```
src/
├── routes/
│   ├── (app)/+layout.svelte      app shell: header · side nav · feed · right rail · mobile tab bar
│   ├── +page.svelte              the feed — campuses within 10 mi of you (?within=50|150|all &campus= &category= &free=1 &q= &sort=)
│   ├── activities/new/           create form  (+page.server.ts = form action)
│   ├── activities/[id]/          detail, join/leave, comments
│   ├── profile/                  your hosted + joined activities, log out
│   ├── login/                    log in / sign up (outside the app shell)
│   ├── api/activities/           GET list / POST create (JSON)
│   └── layout.css                the theme — palette, fluid type, dark mode, .leaf-card/.btn/.field
├── lib/
│   ├── types.ts                  Activity / User / categories / campuses — single source of truth
│   ├── format.ts                 money (integer cents), dates, "2h ago"
│   ├── validate.ts               new-activity validation shared by the form and the API
│   ├── geo.ts                    haversine, campuses-by-distance, the `loc` cookie
│   ├── feed-query.ts             URL params -> FeedQuery
│   ├── components/               ActivityCard, JoinButton, AppHeader, SideNav, …
│   └── server/
│       ├── auth.ts               password hashing + signed session cookie
│       ├── db.ts                 picks a backend from MONGODB_URI; routes import from here
│       ├── seed.ts               demo users/activities (loaded by both backends)
│       └── store/
│           ├── types.ts          the Store interface every backend implements
│           ├── shared.ts         doc -> view builders, feed sort, new-doc factories
│           ├── memory.ts         in-memory backend (local dev)
│           └── mongo.ts          MongoDB backend (production)
└── hooks.server.ts               session cookie -> locals.user; redirects to /login when signed out
```

## Location

The feed is "activities at campuses near you". `CAMPUSES` in `types.ts` carry coordinates; `LocationSync.svelte` asks the browser for a position once and stores `lat,lng` in a `loc` cookie; `hooks.server.ts` turns that into `locals.location` (falling back to your campus). `listActivities` filters to campuses within the chosen radius and every `ActivityView` gets `distanceMiles`.

## Rules of the codebase

- **`Activity` (stored) and `ActivityView` (wire) are different types.** `toView()` in `db.ts` is the only crossing point. Pages and components only ever see `ActivityView`.
- **Money is integer cents.** `costCents: 1250`, never `12.5`. Format with `formatCents()`.
- **Joining must stay atomic.** `joinActivity()` checks capacity and writes in one step. When it becomes a Mongo query, keep the capacity check _inside_ the `findOneAndUpdate` filter.
- **Use semantic colour classes** (`bg-surface`, `text-ink`, `border-hedge`, `bg-brand`), not raw palette ones. Dark mode is handled once in `layout.css`; nothing else needs `dark:`.
- **Svelte 5 props:** `interface Props {…}` then `let { x }: Props = $props()`.

## Deploying (Vercel)

The in-memory store **does not work on Vercel**: each request can land on a fresh serverless instance with empty memory, so sign-ups vanish and sessions stop resolving. Production needs MongoDB.

1. **Atlas**: create a free cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0` (Vercel's IPs change) → Connect → Drivers → copy the URI.
2. **Vercel → Project → Settings → Environment Variables**, for Production _and_ Preview:
   - `MONGODB_URI` — the Atlas URI with your password filled in
   - `MONGODB_DB` — `tagalong`
   - `SESSION_SECRET` — `openssl rand -hex 32`
3. Redeploy (env changes don't apply to existing deployments). The first request seeds the demo data if the database is empty, and the function log prints `[db] backend: MongoDB (tagalong)`.

`hooks.server.ts` sets the session cookie with `secure: true` outside dev, which Vercel's HTTPS satisfies.

## Email

Joining an activity sends two messages through Resend's HTTP API (no SDK):
the host gets "X joined your activity", and the person joining gets a
confirmation with when, where, their share of the cost, and who's hosting.

Set `RESEND_API_KEY` in `.env` / Vercel to turn it on. Without a key both are
logged instead of sent, so joining behaves identically either way, and a mail
failure can never fail a join. `EMAIL_FROM` must be a verified domain to reach
anyone — Resend's default sandbox sender only delivers to the account owner.

## Backend notes

- Documents use our string ids as `_id` (`u_mei`, `a_costco`), so no ObjectId conversion anywhere.
- `joinActivity` is one `findOneAndUpdate` with the capacity check in the filter — keep it that way; read-then-write lets two people take the last spot.
- Unique indexes on `users.email` and `users.handle`; `createUser` relies on the duplicate-key error rather than find-then-insert.
- To add a backend (Postgres, whatever): implement `Store` from `store/types.ts`, reuse `store/shared.ts`, pick it in `db.ts`.

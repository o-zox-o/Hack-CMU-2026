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

No database needed yet — it boots on an in-memory store with seeded users and activities. Log in as `mei@andrew.cmu.edu` / `tagalong` (every seeded account uses that password), or sign up. Data survives hot reloads but resets when the dev server restarts.

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
│       ├── db.ts                 THE data layer. In-memory now; swap bodies for Mongo later.
│       └── mongodb.ts            connection helper, commented out until you `npm i mongodb`
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

## Swapping in the real backend

1. **Auth** is already real — email + password (scrypt) and a signed session cookie. `hooks.server.ts` turns the cookie into `locals.user`. Set `SESSION_SECRET` in `.env`.
2. The `users` collection is `UserDoc` in `types.ts` — put a unique index on `email`.

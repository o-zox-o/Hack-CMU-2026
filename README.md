# tagalong

**Find people to actually hang out with — then split the Costco run on the way.**

tagalong is a campus social feed: karaoke, hikes, board games, study nights, plus the errands and rides you’d do anyway. Post a plan, match with people nearby who are into the same stuff, and go. Built for **Hack CMU 2026**.

The punchline is **touch grass**. Every hangout or activity you join plants a blade on your profile. Your garden grows, badges drop, and joining rains grass across the screen. The point isn’t the receipt — it’s getting out of the dorm.

SvelteKit · Svelte 5 · Tailwind 4 · TypeScript · MongoDB (optional locally)

---

## For judges — run it in two minutes

You do **not** need MongoDB, Auth0, or an email key. With no env vars, the app uses an in-memory store and seeds demo people and activities automatically.

```bash
git clone https://github.com/o-zox-o/Hack-CMU-2026.git
cd Hack-CMU-2026
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**.

### Demo login

|          |                      |
| -------- | -------------------- |
| Email    | `mei@andrew.cmu.edu` |
| Password | `tagalong`           |

Every seeded account uses the same password. Other useful logins:

- `satsuki@andrew.cmu.edu` (CMU)
- `kanta@pitt.edu` (Pitt)
- `ava@psu.edu` (Penn State)

Or create a new account from Sign up (`.edu` emails). New accounts get a short interest survey so the feed can rank hangouts for them.

### What to click through

1. **For you (`/`)** — a mixed feed of hangouts and practical plans, ranked for this user. Look for **% match** on cards. Filter **Hangouts**, or Costco / rides / food if you want the utility side. Radius: 10 / 50 / 150 mi / anywhere.
2. **Open a hangout** — who’s going, comments, join. Joining should celebrate (**you touched grass**) and rain grass.
3. **Profile** — **Grass touched** score, the growing garden (bare patch → meadow), and badges like First blade, Actually outside, Green thumb, Top grass toucher.
4. **Post** — host a hangout or a split-the-cost run.
5. Allow location if asked — otherwise it uses your campus.

Data resets when you stop the dev server in in-memory mode. That’s expected.

---

## What it is

College group chats are how people make plans _and_ how they never make it out. tagalong is the public version:

- **Hangouts first** — karaoke, hikes, game nights, watch parties, not only bulk buys.
- **People, not just spots** — interest survey on signup, match % on the feed, so you find folks you’d actually spend an afternoon with.
- **Split when it helps** — Costco, Ubers, Spotify, delivery minimums still live here. Same join flow.
- **Touch grass** — each activity you’re in is a blade. Profile garden + badges. Join animation so it feels like going outside, not filing a form.
- **Campus-aware** — CMU, Pitt, Chatham, Duquesne, Carlow, WVU, Penn State, with distance on every card.

---

## Touch grass (gamification)

|        |                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| Score  | Hosted + joined activities                                                                                   |
| Garden | Grows from bare patch → seedling → sprouting → lawn → in bloom → wildflower meadow                           |
| Badges | First blade, Regular, Certified outside, Green thumb (host), Actually outside (hangouts), plus category ones |
| Live   | Grass rain + “you touched grass” when you join                                                               |

Open **Profile** on the Mei account to see a garden that’s already growing.

---

## Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| UI        | Svelte 5 (runes) + Tailwind 4                                |
| App / API | SvelteKit 2                                                  |
| Data      | In-memory for local demo; MongoDB Atlas in production        |
| Auth      | Session cookie (scrypt). Optional Auth0 email code on signup |
| Matching  | Interests + campus + budget + distance                       |
| Email     | Optional [Resend](https://resend.com) on join                |

---

## Local setup (more detail)

**Need:** Node.js 20+ and npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # types + Svelte
npm run lint
```

### Optional `.env`

Copy `.env.example` → `.env` only if you want persistence or extra features.

| Variable                        | What it does                                                           |
| ------------------------------- | ---------------------------------------------------------------------- |
| _(none)_                        | In-memory demo. Fastest path for judging.                              |
| `MONGODB_URI` + `MONGODB_DB`    | Persist to Atlas. Empty DB is seeded on first connect.                 |
| `SESSION_SECRET`                | Signs the login cookie. Dev has a fallback; set this before deploying. |
| `RESEND_API_KEY` + `EMAIL_FROM` | Email host + joiner on join. Without a key, joins still work.          |
| `AUTH0_*`                       | Signup email verification. Seeded logins don’t need this.              |

The terminal prints which backend started, e.g. `[db] backend: in-memory` or `MongoDB (tagalong)`.

---

## Deploy (Vercel)

The in-memory store **does not work on Vercel** (each request can hit a fresh instance). Production needs MongoDB.

1. Atlas free cluster → database user → network access `0.0.0.0/0` → copy the connection URI.
2. Vercel → Project → Settings → Environment Variables (Production **and** Preview):
   - `MONGODB_URI`
   - `MONGODB_DB` = `tagalong`
   - `SESSION_SECRET` = `openssl rand -hex 32`
3. Redeploy after adding env vars. First request seeds demo data if the database is empty.

---

Hack CMU 2026 · Touch grass with people from the next campus over.

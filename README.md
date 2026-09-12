# tagalong!

**Find people nearby to do stuff with.**

tagalong is an app for finding other college students nearby to join activities, hangouts, trips, rides, errands, and other plans.

You can post something you want to do, find people with similar interests, join activities nearby, and coordinate through comments.

Built for **HackCMU 2026**.

A big part of the project is **touching grass**: every hangout or activity you join grows your little grass garden and unlocks badges!

SvelteKit · Svelte 5 · Tailwind 4 · TypeScript · MongoDB

### Demo login

| | |
|---|---|
| Email | `mei@andrew.cmu.edu` |
| Password | `tagalong` |

Every seeded account uses the same password. Other useful logins:

- `satsuki@andrew.cmu.edu` (CMU)
- `kanta@pitt.edu` (Pitt)
- `ava@psu.edu` (Penn State)

Or create a new account from Sign up (`.edu` emails). New accounts get a short interest survey so the feed can rank hangouts for them.

### What to click through

1. **For you (`/`)** — a mixed feed of hangouts and practical plans, ranked for this user based on interests. Look for **% match** on cards. Filter by category. Set a mile radius for how far away you're willing to go.
2. **Open a hangout** — See who’s already going, comments, and join the group. Joining an activity celebrates that (**you touched grass**) and rains confetti grass.
3. **Profile** — **Grass touched** score, a growing garden (bare patch to a meadow), and badges.
4. **Post** — host a hangout or a split-the-cost run.
5. Allow location if asked, otherwise it uses your campus.

---

## What it is

College group chats are how people make plans *and* how they never make it out. tagalong is the public version:

- **Hangouts first** — karaoke, hikes, game nights, watch parties, or bulk buys.
- **Find similar people, not just spots** — interest survey on signup, match % on the feed, so you find folks you’d actually spend an afternoon with.
- **Split when it helps** — Costco, Ubers, Spotify, delivery to lower individual costs.

---

## Touch grass (gamification)

| | |
|---|---|
| Score | Hosted + joined activities |
| Garden | Grows from bare patch -> seedling -> sprouting -> lawn -> in bloom -> wildflower meadow |
| Badges | First blade, Regular, Certified outside, Green thumb (host), Actually outside (hangouts), plus category ones |
| Live | Grass rain + “you touched grass” when you join |

Open **Profile** on the Demo account to see a garden that’s already growing.

---

## Stack

| Layer | Choice |
|---|---|
| UI | Svelte 5 (runes) + Tailwind 4 |
| App / API | SvelteKit 2 |
| Data | MongoDB Atlas |
| Auth | Auth0 |
| Matching | Interests + campus + budget + distance |
| Email | Optional [Resend](https://resend.com) on join |

# Bloom 🌱

A small, installable Progressive Web App designed to make one specific person's day
a little better every time they open it.

It does three things:

1. **Daily Joy Engine** — every open serves a *different* small joy experience from a
   rotating pool of 13, so it never feels repetitive.
2. **Calm Toolkit** — a one-tap escape hatch with a 4-7-8 breathing exercise and a
   5-4-3-2-1 grounding exercise, reachable from anywhere in the app.
3. **The menu** — a bottom-left button that opens every experience on demand, plus a
   summary of everything saved on the device.

No backend, no accounts, no analytics, no tracking. Everything lives on the device.

**Live demo:** https://jateenyadav.github.io/bloom-pwa/ — running on the generic
placeholder content, since the personal config is gitignored and never reaches CI.

**This repo is deliberately generic.** There are no names, photos, or personal
messages in the committed code — all of that comes from a single gitignored config
file. Fork it and make it about your person.

---

## Make it yours

```bash
git clone <your-fork> bloom && cd bloom
npm install
cp src/config/personal.example.json src/config/personal.json   # this file is gitignored
npm run dev
```

Then edit `src/config/personal.json`. Every field is optional — anything you leave
out falls back to the generic placeholder in `personal.example.json`.

| Field | What it does |
| --- | --- |
| `personName` | Their name, for use in copy |
| `greeting` | The line under the companion (e.g. `"Hey you."`) |
| `birthdayDate` | `"MM-DD"` (or a full `YYYY-MM-DD`; the year is ignored, so it recurs annually). Triggers Birthday Mode. |
| `petNames` | Array of cute nicknames. A different one greets them on every open, and none repeats until the whole list has been used — so a longer list means longer before they hear one twice. Sprout uses the same nickname when you tap it. |
| `compliments` | Array of affirmations for the slot machine |
| `gratitudePrompts` | Array of prompts, one picked per visit |
| `fortunes` | Array of lines for the fortune cookie. Fortune-shaped ("something you've been waiting on is closer than it looks") reads better here than a compliment. |
| `memories` | Array of `{ id, caption, gradient, date }` — the gradient cards the memory wall starts with. **No image paths:** photos are added in the app, not in config. |

`personal.json` is loaded via `import.meta.glob`, so the build works fine when it's
absent — a fresh clone or a CI build just uses the example content.

### Photos: added in the app, never in the repo

**Don't put image files in this repo.** It's public, so a photo committed to
`public/` is visible to anyone who finds the URL — and a fork of this app should be
about *your* person, not whoever built it.

Instead, photos are added at runtime, from the device:

1. Open the **Memory wall** (it's in the menu).
2. Tap **Add a photo** and pick from the camera roll or file picker. Optionally type
   a caption first and it gets attached to the next photo you pick.

What happens to the file:

- It's drawn to a `<canvas>`, scaled so the long edge is at most 1400px, and
  re-encoded as JPEG at quality 0.82. That keeps it small — and re-encoding drops the
  EXIF block, so **GPS coordinates and camera metadata are stripped** on the way in.
- The resulting Blob is stored in **IndexedDB** (`bloom-photos`), not localStorage —
  localStorage is string-only and caps around 5MB, so photos would need base64 (a 33%
  size penalty) and would fill it after two or three pictures.
- Nothing is uploaded. There is no server to upload to.

So: the photos are on that one device, in that one browser. They survive reloads,
offline use, and reinstalling the app to the home screen. They do *not* sync to
another phone, and clearing the browser's site data deletes them. That's the
tradeoff a no-backend app makes, and it's the reason the app works with no signal.

The memory wall footer shows how many photos are stored and how much space they take.
Each photo has a **Remove** button in its detail view.

The committed `memories` placeholders have no image at all — they render as soft
gradient cards, which is what the live demo shows.

## The 13 experiences

Every one is reachable from the menu, and one is served automatically per open.

| | Experience | What it is | Remembers |
| --- | --- | --- | --- |
| 🎰 | A reminder | Slot machine that lands on something true about you | — |
| 🫙 | One small thing | One good thing about today, kept in a jar | your notes |
| 🖍️ | Doodle pad | Crayon scribbling with stampable stickers | — |
| 📸 | Memory wall | Your own photos, taped up like polaroids | photos |
| ⭐️ | Wish jar | Write a wish on a star, drop it in, mark it come true | wishes |
| 🌷 | Mood garden | Plant how today feels; every mood gets a flower | one flower per day |
| 💌 | Time capsule | A note to yourself, sealed for a week/month/season | sealed notes |
| 🥠 | Fortune cookie | Crack it open, read the slip | — |
| 🤗 | Need a hug? | One big button; press it and get squeezed | hug count |
| 🫧 | Bubble wrap | A full sheet to pop, with the sound | total popped |
| 🎟️ | Scratch card | Scratch the foil off to find the message | — |
| 🌟 | Star catcher | Catch falling stars — no timer, no score, nothing to lose | stickers won |
| 📖 | Sticker book | Every sticker Star Catcher has given you | 12 to find |

A **heavy day plants a sleepy blue bloom, not a dead one.** Nothing in here has a lose
condition, a streak to break, or a guilt message — that's a deliberate constraint, not
an oversight.

The time capsule's lock is honest but not cryptographic: it checks the device clock, so
changing the date would open it early. Encrypting a note against its author would be
security theatre for no gain.

## The menu

The bottom-**left** button opens a spring-animated drawer with all 13 experiences and a
**Saved on this device** panel that counts every collection (wishes, moods, hugs,
bubbles, stickers, photos, sealed capsules) plus how many distinct days the app has been
opened.

Picking something from the menu overrides today's experience *for that visit only*. It's
deliberately not persisted: the rotation has already advanced, so browsing the menu can't
derail tomorrow's surprise.

The calm button owns the bottom-right corner and sits above the menu (`z-50` vs `z-45`)
— it must never have to share space or wait its turn.

## Commands

```bash
npm run dev       # dev server
npm run build     # production build to dist/
npm run preview   # serve the built output (use this to test install/offline)
npm test          # 58 unit tests: rotation engine, breathing schedule, store, pool
npm run icons     # regenerate PWA icons from scripts/generate-icons.mjs
```

## Installing it on a phone

The PWA bits (manifest, service worker, offline precache, iOS meta tags) are wired
up, and `base: './'` means the build works from a subpath too.

- **Android/Chrome** — visit the deployed URL, then *Install app* from the menu.
- **iOS/Safari** — visit the URL, then Share → *Add to Home Screen*.

Service workers need HTTPS (or `localhost`), so test installs against `npm run
preview` locally or the real deployed URL — not a LAN IP over plain HTTP.

Deploy `dist/` as static files anywhere: Vercel, Netlify, GitHub Pages.

## How the rotation works

`src/engine/rotationEngine.js` is pure and unit-tested — no React, no localStorage,
no `Date.now()`. Everything variable is injected, so the behaviour is deterministic
in tests.

- A **cycle** is one full pass through the pool. Each open consumes the next id.
- An experience **cannot repeat until every experience in the cycle has been shown.**
- When a cycle ends it reshuffles, and never reproduces the previous order verbatim.
- `weight` does two things: it biases position within a cycle, and for experiences
  tagged `special` it's also the probability of being admitted to a cycle at all
  (`0.25` ≈ one cycle in four), which is what makes rare things genuinely rare.
- Experiences tagged `birthday` never enter the normal rotation.

The React-facing wrapper is `useDailyExperience()`, returning
`{ experience, markSeen, isBirthday }`.

### Adding an experience

Write the component, then add one entry to `src/experiences/index.js`:

```js
{
  id: 'bubble-wrap',           // stable — it's persisted in localStorage
  type: 'toy',
  component: BubbleWrap,
  weight: 1,
  tags: ['common', 'play'],
  title: 'Bubble wrap',
  glyph: '🫧',                 // the menu tile
  blurb: 'A whole sheet to pop. With the sound.',
  // Optional. Lets the menu report what's saved without knowing how this works.
  saves: { key: 'bubblesPopped', label: 'popped', count: (state) => state.bubblesPopped },
}
```

Nothing else needs to change — the rotation engine and the menu both read this one
list. If your experience remembers something, add its key to `useBloomStore`
(`resetAll` and `partialize` included) and point `saves` at it.

`src/experiences/pool.test.js` enforces the contract: unique ids, every field its four
consumers need, well-formed `saves` descriptors, and counts that don't throw on a fresh
empty state.

### One rule if your experience opens a fullscreen view

Use `z-[40]` (`LAYER.EXPERIENCE_OVERLAY` in `src/constants/layers.js`). The calm
button sits at `z-50` and must stay on top — that's what makes it one tap from
anywhere. See `MemoryWall.jsx` for a working example.

## The companion

The sprout grows one step per *distinct day* the app is opened. Growth only ever
increases: there are no streaks, no decay, and no guilt messaging if days are
skipped. Repeat opens on the same day don't inflate it.

## Project layout

```
src/
  engine/          pure, tested logic (rotation, breathing schedule)
  store/           the single persisted zustand store
  hooks/           useDailyExperience, usePhotos (object-URL lifecycle owner)
  lib/             photoStore.js — IndexedDB + canvas shrink/re-encode
  experiences/     the 13 joy experiences + the pool registry (index.js)
  components/
    calm/               CalmToolkit, BreathingExercise, GroundingExercise
    ExperienceMenu.jsx  the animated menu + saved-memory panel
    Companion.jsx       the growing sprout
  config/          personal.example.json (committed) + loader
  constants/       the z-index layer scale
scripts/           dependency-free PWA icon generator
```

## Status

**Phase 1 (MVP) — complete.** Installable offline-first PWA shell, rotation engine
with tests, Calm Toolkit, the growing companion.

**Phase 2 — mostly complete.** Pool expanded to 13 experiences, animated menu with a
saved-memory panel, device-side photo storage, rotating pet-name greeting. Still open:
the full Birthday Mode sequence (the `isBirthday` flag is already wired and changes the
greeting), discrete companion growth stages, theme picker.

**Phase 3 — not started.** Ambient soundscapes, custom install prompt, full
accessibility pass, optional gentle local notification.

## Non-goals

No backend, no cloud sync, no accounts, no analytics, no push notifications, and no
AI-generated content at runtime. Every message in the app is static and human-written.

## License

MIT.

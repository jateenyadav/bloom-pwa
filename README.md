# Bloom 🌱

A small, installable Progressive Web App designed to make one specific person's day
a little better every time they open it.

It does two things:

1. **Daily Joy Engine** — every open serves a *different* small joy experience from a
   rotating pool, so it never feels repetitive.
2. **Calm Toolkit** — a one-tap escape hatch with a 4-7-8 breathing exercise and a
   5-4-3-2-1 grounding exercise, reachable from anywhere in the app.

No backend, no accounts, no analytics, no tracking. Everything lives on the device.

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
| `memories` | Array of `{ id, caption, image, gradient, date }` for the memory wall |

For photos, drop files in `public/memories/` (also gitignored) and reference them as
`"image": "memories/your-photo.jpg"`. Entries with `"image": null` render as a soft
gradient card instead, which is what the open-source placeholders do.

`personal.json` is loaded via `import.meta.glob`, so the build works fine when it's
absent — a fresh clone or a CI build just uses the example content.

## Commands

```bash
npm run dev       # dev server
npm run build     # production build to dist/
npm run preview   # serve the built output (use this to test install/offline)
npm test          # unit tests for the rotation engine + breathing schedule
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
}
```

Nothing else needs to change.

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
  hooks/           useDailyExperience — engine ⇄ storage wiring
  experiences/     the joy experiences + the pool registry (index.js)
  components/
    calm/          CalmToolkit, BreathingExercise, GroundingExercise
    Companion.jsx  the growing sprout
  config/          personal.example.json (committed) + loader
  constants/       the z-index layer scale
scripts/           dependency-free PWA icon generator
```

## Status

**Phase 1 (MVP) — complete.** Installable offline-first PWA shell, rotation engine
with tests, Calm Toolkit, four joy experiences (compliment slot machine, gratitude
prompt, doodle pad, memory wall), and the growing companion.

**Phase 2 — not started.** Full Birthday Mode sequence (the `isBirthday` flag is
already wired and changes the greeting), pool expanded to 10-12 experiences, discrete
companion growth stages, theme picker.

**Phase 3 — not started.** Ambient soundscapes, custom install prompt, full
accessibility pass, optional gentle local notification.

## Non-goals

No backend, no cloud sync, no accounts, no analytics, no push notifications, and no
AI-generated content at runtime. Every message in the app is static and human-written.

## License

MIT.

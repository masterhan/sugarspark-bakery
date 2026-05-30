# Decisions log

A running record of choices made while building Sugarspark Bakery, and why. Newest first.

---

## Engine: Phaser 3 (kept, per PRD §9.1)

A bakery tycoon is mostly panels, counters, and timers, so a plain-website approach (React + CSS)
was a fair alternative. Phaser was kept because (a) the game wants real "juice" — customers walking
in, coins flying, eating animations — which a game engine does naturally, and (b) the whole art
pipeline (packed sprite sheets + a manifest) was already designed around Phaser. Switching would
throw away good, decided work for no clear win. Pure TypeScript throughout, so the code stays
readable with an AI assistant.

## Hosting: public GitHub repo + GitHub Pages

Chosen for zero-cost, zero-config hosting. Trade-off: a public repo means the code is visible to
anyone. That's harmless here — there are no secrets, no backend, and no user data. (A private repo
would have required Netlify instead.)

**Deploy method (current): `gh-pages` branch, not GitHub Actions.** The `gh` login used to create
the repo lacked the `workflow` permission, so GitHub blocked pushing the Actions workflow files.
The site is therefore deployed the classic way: `npm run build`, then the built `dist/` is pushed
to a `gh-pages` branch which Pages serves. The Actions workflows are kept ready in
`.github/workflows-pending/` — see that folder's README to re-enable them with one command
(`gh auth refresh -s workflow`). To redeploy manually after a change:

```bash
npm run build
cd dist && touch .nojekyll && rm -rf .git && git init -q && git checkout -b gh-pages \
  && git add -A && git commit -m "deploy" \
  && git push https://github.com/masterhan/sugarspark-bakery.git gh-pages:gh-pages
```

## Art is decoupled (placeholder system)

The build does NOT generate raster art. Instead, every picture is a logical key (e.g.
`treat_cookie`), and the game draws a colored placeholder for each key at runtime. Real
AI-generated art drops in later by editing `public/assets/manifest.json` only — no code changes.
This means development never blocks on art.

## "Days" cadence: 10 sales per day

The PRD (§4.5) says advance a "day" every N sales but left N open. Picked **10** as a gentle,
frequent celebration cadence. Tunable in `src/config/balance.ts` (`DAYS.salesPerDay`). Days are
pacing/delight only — never a penalty.

## Times stored in seconds

`balance.ts` stores bake times, patience, and arrival gaps in **seconds** (not milliseconds) so a
non-technical owner reads them the way they think ("a cookie bakes in 20"). The game converts to
milliseconds internally.

---

## ⚠️ AI-art caveats the owner must know (PRD §6.6)

- **Consistency is the hard part of AI art.** Budget time for regenerating and cleaning up images.
  Use a fixed seed + the same style sentence for every asset (see `art/PROMPTS.md`).
- **AI-art licensing is legally unsettled** and varies by tool and jurisdiction. Check each tool's
  commercial-use terms before any paid distribution, and keep a record of which tool generated what.
  _(This is not legal advice.)_
- **Review every asset for age-appropriateness** before it ships. Audience is children 6–8.

---

## Deferred (logged, not built — keeps v1 focused, PRD §14)

_Nothing deferred yet. When a request falls outside v1 scope, it gets logged here and the build
continues._

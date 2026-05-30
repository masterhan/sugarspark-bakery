# 🧁 Sugarspark Bakery

A cozy, no-fail bakery game for kids ages 6–8. Bake treats, sell them to happy customers, earn
coins, and grow your bakery. No timers that punish, no failure, no ads — just a warm, kind game.

Plays in any web browser on a laptop or tablet. Nothing is installed on the player's device and
**no data is ever collected**.

> **Status:** in active development, built milestone by milestone. See `PROGRESS.md`.

---

## ▶️ Play it online

Once deployed, the game lives at:

**https://masterhan.github.io/sugarspark-bakery/**

---

## 🛠️ Run it on your own computer

You only need to do step 1 once.

1. **Install Node.js** (the thing that runs the project). Go to <https://nodejs.org>, download the
   "LTS" version, and install it like any normal app.
2. **Open a Terminal** in this project folder.
3. **Install the project's pieces** (one time, and again only if you pull new code):
   ```bash
   npm install
   ```
4. **Start the game in dev mode:**
   ```bash
   npm run dev
   ```
   It will print a web address (like `http://localhost:5173`). Open it in your browser to play.
   The page updates automatically as the code changes.

To stop it, press `Ctrl + C` in the Terminal.

---

## 🎚️ Change how the game plays (rebalancing)

**Every number you'd want to tweak lives in ONE file:** `src/config/balance.ts`.

Costs, sell prices, how long things bake, how often customers come, what you start with — all there,
with plain-English comments. Change a number, save the file, and (if `npm run dev` is running) the
game reloads with your change. You do not need to touch any other file to rebalance the economy.

---

## 🎨 Add your real artwork (no coding needed)

The game ships with simple colored placeholder pictures so it's fully playable right now. To swap in
real art:

1. Read `art/PROMPTS.md` — it has the exact art style and the AI prompt to use, so every picture
   matches.
2. Generate your images, clean them up, and pack them into one sprite sheet (see `art/PROMPTS.md`
   for the free tools).
3. Put the packed files into `public/assets/atlas/`.
4. Open `public/assets/manifest.json`, set `"useRealArt": true`, and list which picture goes with
   each name.
5. Refresh the game — your art now shows instead of the placeholders. **No code changes.**

---

## 🚀 Put it on the internet (GitHub Pages — free)

The game is already published at the address above. It's served from the repo's **`gh-pages`
branch** (a branch that holds the built site).

To publish a change, build and push the built site:

```bash
npm run build
cd dist && touch .nojekyll && rm -rf .git && git init -q && git checkout -b gh-pages \
  && git add -A && git commit -m "deploy" \
  && git push https://github.com/masterhan/sugarspark-bakery.git gh-pages:gh-pages
```

**Want it to publish itself automatically on every push?** That needs a one-time permission grant —
see `.github/workflows-pending/README.md` (run `gh auth refresh -h github.com -s workflow`, move the
two workflow files into `.github/workflows/`, and set **Settings → Pages → Source** to
**"GitHub Actions"**).

---

## 📁 What's where (for the curious)

| Folder                  | What's in it                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `src/config/balance.ts` | **All the tunable numbers.** Start here to rebalance.          |
| `src/data/`             | The treats, ingredients, upgrades, and customer types.         |
| `src/systems/`          | The game's brain: baking, inventory, customers, money, saving. |
| `src/scenes/`           | The screens you see (title, the bakery).                       |
| `public/assets/`        | Pictures and sounds. Real art drops in here.                   |
| `art/PROMPTS.md`        | The art style guide + AI prompt.                               |
| `DECISIONS.md`          | Why things were built the way they were.                       |
| `PROGRESS.md`           | The build checklist.                                           |

---

## 🧰 Commands

| Command           | What it does                                           |
| ----------------- | ------------------------------------------------------ |
| `npm run dev`     | Play the game while developing (auto-reloads).         |
| `npm run build`   | Make the final, optimized version (output in `dist/`). |
| `npm run preview` | Preview that final version locally.                    |
| `npm run test`    | Run the automatic checks on the game's logic.          |
| `npm run lint`    | Check the code for mistakes.                           |
| `npm run format`  | Auto-tidy the code's formatting.                       |

---

Built to be cozy. 💛

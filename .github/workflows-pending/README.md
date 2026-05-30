# Pending GitHub Actions workflows

These two workflows (`ci.yml` = lint+test+build on every push; `deploy.yml` = build &
publish to GitHub Pages) are ready to go but are **parked here** instead of in
`.github/workflows/`.

## Why they're parked

The `gh` login used to create this repo did not have the **`workflow`** permission, and GitHub
refuses any push that adds or edits files under `.github/workflows/` without it. So the site is
currently deployed the simpler "classic" way instead: the built site is pushed to the **`gh-pages`
branch**, and Pages serves that branch.

## How to turn the automatic workflows back on (one-time)

1. Grant the permission (opens a browser to confirm):
   ```bash
   gh auth refresh -h github.com -s workflow
   ```
2. Move these files into the real folder and push:
   ```bash
   git mv .github/workflows-pending/ci.yml .github/workflows/ci.yml
   git mv .github/workflows-pending/deploy.yml .github/workflows/deploy.yml
   git commit -m "ci: enable GitHub Actions"
   git push
   ```
3. In the repo's **Settings → Pages**, set **Source** back to **"GitHub Actions."**

After that, every push to `main` runs the checks and redeploys automatically — and you can ignore
the manual `gh-pages` deploy below.

## Meanwhile: how to redeploy manually

```bash
npm run build
# publish the built ./dist to the gh-pages branch (see DECISIONS.md for the exact commands)
```

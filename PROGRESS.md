# Build progress

Milestones from the PRD §12, built in order. Each ends with `npm run lint` + `npm run test` +
`npm run build` green and a commit.

- [x] **M0 — Project setup.** Phaser + TS + Vite; ESLint/Prettier; Vitest; GitHub Actions CI + Pages
      deploy; folder structure; `balance.ts` with §5 values; data files; typed event bus; runtime
      placeholder-asset system + manifest; README/DECISIONS/PROGRESS/art prompts.
      _Done when:_ `npm run dev` shows a window; CI passes. ✅
- [x] **M1 — Core loop vertical slice.** Tap Bake → pick a recipe → ingredients consume, oven
      progress ring + ding bounce, batch lands on the display. Customers slide in wanting a treat
      (patience ring); tap to serve → happy eat + coins fly + tip; patience out → leave happily, no
      penalty. 4 systems, 20 unit tests. Verified live (zero console errors). ✅
- [ ] **M2 — Full baking & inventory.** All four recipes; ingredient + finished-goods inventories;
      multiple ovens; display capacity + auto-refill from back stock.
- [ ] **M3 — Customer system.** Timed arrivals, wants, patience, forgiving leave, serve, eating,
      tips, cosmetic variants, object pooling.
- [ ] **M4 — Economy, shop & progression.** Buy ingredients/upgrades; unlock recipes; apply upgrade
      effects; soft days + celebration; low-coin safety net.
- [ ] **M5 — Save / load / settings.** Auto-save, versioned schema + `migrate()`, export/import JSON,
      mute, name-your-bakery/baker.
- [ ] **M6 — Art & audio integration + polish.** Real-art swap via manifest; audio + mute persist;
      accessibility (§8.4); juice; responsive pass.
- [ ] **M7 — Deploy & document.** GitHub Pages live; finalize README; playtest checklist.

## Notes

- All tunable numbers live in `src/config/balance.ts` (only).
- Game logic (state + systems) is Phaser-free and unit-tested with Vitest.

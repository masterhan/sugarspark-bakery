import { describe, expect, it } from 'vitest';
import { TypedEmitter } from '../src/events/EventBus';
import { GameController } from '../src/state/GameController';
import { getRecipe, treatIds } from '../src/data/recipes';
import type { IngredientId, TreatId, UpgradeId } from '../src/data/types';

/** Deterministic PRNG (mulberry32) so the whole play-through is reproducible. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Make sure we can afford to bake `recipeId` by buying any missing ingredients. */
function stockFor(game: GameController, recipeId: TreatId): void {
  const recipe = getRecipe(recipeId);
  for (const [id, need] of Object.entries(recipe.ingredients)) {
    const have = game.state.getIngredient(id as IngredientId);
    if (have < (need ?? 0)) {
      game.buyIngredient(id as IngredientId, (need ?? 0) - have);
    }
  }
}

/**
 * A simple "auto-player": serve anyone we can, bake the best recipe we can afford on every
 * free oven, and buy upgrades as soon as they're affordable. This is the same kind of play a
 * child would do — it just runs in milliseconds and is fully deterministic.
 */
function autoPlayStep(game: GameController): void {
  // 1) Serve every waiting customer whose treat is in stock.
  for (const customer of [...game.customers.active]) {
    if (game.state.getFinished(customer.wantedTreat) > 0) game.serve(customer.id);
  }

  // 2) Bake on every free oven — prefer the most valuable unlocked recipe we can stock.
  const byValueDesc = [...game.state.unlockedRecipes].sort(
    (a, b) => getRecipe(b).sellPrice - getRecipe(a).sellPrice,
  );
  while (game.baking.firstFreeOven() >= 0) {
    let baked = false;
    for (const recipeId of byValueDesc) {
      stockFor(game, recipeId);
      if (game.state.hasIngredientsFor(getRecipe(recipeId))) {
        if (game.bake(recipeId) !== null) {
          baked = true;
          break;
        }
      }
    }
    if (!baked) break; // couldn't afford/stock anything right now
  }

  // 3) Buy upgrades the moment they're affordable (cheapest-impactful first).
  const wishlist: UpgradeId[] = ['speedyOven', 'biggerDisplay', 'cheerySign', 'secondOven'];
  for (const id of wishlist) {
    if (game.shop.canBuyUpgrade(id)) game.buyUpgrade(id);
  }
}

describe('full play-through (auto-played, deterministic)', () => {
  it('bakes, sells, grows profitably, unlocks recipes, and applies upgrades', () => {
    const bus = new TypedEmitter();
    const game = new GameController(bus, makeRng(12345));

    const unlocks: TreatId[] = [];
    bus.on('RECIPE_UNLOCKED', (p) => unlocks.push(p.recipeId));

    const DT = 100; // ms per tick
    const TICKS = 18000; // ~30 minutes of simulated play
    let minCoinsSeen = game.state.coins;

    for (let i = 0; i < TICKS; i++) {
      game.tick(DT);
      autoPlayStep(game);
      if (game.state.coins < minCoinsSeen) minCoinsSeen = game.state.coins;
    }

    // The loop actually ran: lots of treats baked and sold.
    expect(game.state.salesTotal).toBeGreaterThan(50);

    // Gently profitable: lifetime earnings are well ahead, current balance grew past the start.
    expect(game.state.coinsEarnedTotal).toBeGreaterThan(400);
    expect(game.state.coins).toBeGreaterThan(50);

    // Forgiving: coins never went negative at any point.
    expect(minCoinsSeen).toBeGreaterThanOrEqual(0);

    // Progression fired: pie (150) and cake (400) unlocked; days advanced.
    expect(game.state.isRecipeUnlocked('pie')).toBe(true);
    expect(game.state.isRecipeUnlocked('cake')).toBe(true);
    expect(unlocks).toContain('pie');
    expect(game.state.day).toBeGreaterThan(1);

    // Upgrades were bought and actually took effect.
    expect(game.state.upgradesOwned.length).toBeGreaterThanOrEqual(1);
    if (game.state.hasUpgrade('speedyOven')) {
      expect(game.baking.bakeDurationMs('cookie')).toBe(14000);
    }
    if (game.state.hasUpgrade('secondOven')) {
      expect(game.baking.ovens.length).toBe(2);
    }

    // Every finished-goods count is a sane non-negative integer.
    for (const t of treatIds) {
      expect(Number.isInteger(game.state.getFinished(t))).toBe(true);
      expect(game.state.getFinished(t)).toBeGreaterThanOrEqual(0);
    }
  });
});

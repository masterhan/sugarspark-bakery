import { describe, expect, it } from 'vitest';
import { TypedEmitter } from '../src/events/EventBus';
import { GameController } from '../src/state/GameController';
import { SaveSystem, type StorageLike } from '../src/systems/SaveSystem';
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

/** In-memory storage so save/reload can be tested without a browser. */
class MemStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
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
  for (const customer of [...game.customers.active]) {
    if (game.state.getFinished(customer.wantedTreat) > 0) game.serve(customer.id);
  }

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
    if (!baked) break;
  }

  const wishlist: UpgradeId[] = ['speedyOven', 'biggerDisplay', 'cheerySign', 'secondOven'];
  for (const id of wishlist) {
    if (game.shop.canBuyUpgrade(id)) game.buyUpgrade(id);
  }
}

function runFor(game: GameController, ticks: number, dtMs = 100): number {
  let minCoins = game.state.coins;
  for (let i = 0; i < ticks; i++) {
    game.tick(dtMs);
    autoPlayStep(game);
    if (game.state.coins < minCoins) minCoins = game.state.coins;
  }
  return minCoins;
}

describe('full play-through (auto-played, deterministic)', () => {
  it('bakes, sells, grows profitably, unlocks recipes, and applies upgrades', () => {
    const bus = new TypedEmitter();
    const game = new GameController(bus, makeRng(12345));

    const unlocks: TreatId[] = [];
    bus.on('RECIPE_UNLOCKED', (p) => unlocks.push(p.recipeId));

    const minCoinsSeen = runFor(game, 18000); // ~30 minutes of simulated play

    expect(game.state.salesTotal).toBeGreaterThan(50);
    expect(game.state.coinsEarnedTotal).toBeGreaterThan(400);
    expect(game.state.coins).toBeGreaterThan(50);
    expect(minCoinsSeen).toBeGreaterThanOrEqual(0); // forgiving — never negative

    expect(game.state.isRecipeUnlocked('pie')).toBe(true);
    expect(game.state.isRecipeUnlocked('cake')).toBe(true);
    expect(unlocks).toContain('pie');
    expect(game.state.day).toBeGreaterThan(1);

    expect(game.state.upgradesOwned.length).toBeGreaterThanOrEqual(1);
    if (game.state.hasUpgrade('speedyOven')) {
      expect(game.baking.bakeDurationMs('cookie')).toBe(14000);
    }
    if (game.state.hasUpgrade('secondOven')) {
      expect(game.baking.ovens.length).toBe(2);
    }

    for (const t of treatIds) {
      expect(Number.isInteger(game.state.getFinished(t))).toBe(true);
      expect(game.state.getFinished(t)).toBeGreaterThanOrEqual(0);
    }
  });

  it('saves, reloads, and the bakery survives exactly — then keeps playing', () => {
    const save = new SaveSystem(new MemStorage());
    const game = new GameController(new TypedEmitter(), makeRng(777));

    runFor(game, 12000); // play ~20 minutes
    const before = game.state.toSave();
    expect(before.salesTotal).toBeGreaterThan(20);
    expect(before.upgradesOwned.length).toBeGreaterThanOrEqual(1);

    // Save, then reload into a brand-new controller (as a page reload would).
    save.write(game.state);
    const reloaded = save.load();
    expect(reloaded).not.toBeNull();
    expect(reloaded!.toSave()).toEqual(before); // exact restore — nothing lost

    const game2 = new GameController(new TypedEmitter(), makeRng(42), reloaded!);
    const salesAtReload = game2.state.salesTotal;
    const minCoins = runFor(game2, 3000); // keep playing the restored bakery
    expect(game2.state.salesTotal).toBeGreaterThan(salesAtReload);
    expect(minCoins).toBeGreaterThanOrEqual(0);
  });

  it('export then import reproduces the bakery exactly', () => {
    const save = new SaveSystem(new MemStorage());
    const game = new GameController(new TypedEmitter(), makeRng(5));
    runFor(game, 6000);

    const json = save.exportJson(game.state);
    const imported = save.importJson(json);
    expect(imported).not.toBeNull();
    expect(imported!.toSave()).toEqual(game.state.toSave());
  });
});

import { describe, expect, it } from 'vitest';
import { RECIPES, INGREDIENTS, UPGRADES, STARTING } from '../src/config/balance';
import { ingredientById } from '../src/data/ingredients';

describe('balance data integrity', () => {
  it('every recipe references real ingredients with positive amounts', () => {
    for (const recipe of RECIPES) {
      const entries = Object.entries(recipe.ingredients);
      expect(entries.length).toBeGreaterThan(0);
      for (const [id, amount] of entries) {
        expect(ingredientById.has(id as never), `${recipe.id} -> ${id}`).toBe(true);
        expect(amount, `${recipe.id} -> ${id}`).toBeGreaterThan(0);
      }
      expect(recipe.batchSize).toBeGreaterThan(0);
      expect(recipe.sellPrice).toBeGreaterThan(0);
      expect(recipe.bakeTimeSeconds).toBeGreaterThan(0);
    }
  });

  it('recipes are gently profitable (sell value of a batch beats ingredient cost)', () => {
    for (const recipe of RECIPES) {
      const ingredientCost = Object.entries(recipe.ingredients).reduce((sum, [id, amount]) => {
        const def = ingredientById.get(id as never);
        return sum + (def ? def.cost * (amount ?? 0) : 0);
      }, 0);
      const batchValue = recipe.sellPrice * recipe.batchSize;
      expect(batchValue, `${recipe.id} must profit`).toBeGreaterThan(ingredientCost);
    }
  });

  it('starting recipes are unlocked at 0 coins; later recipes are gated', () => {
    const cookie = RECIPES.find((r) => r.id === 'cookie');
    const cake = RECIPES.find((r) => r.id === 'cake');
    expect(cookie?.unlockAtCoinsEarned).toBe(0);
    expect(cake?.unlockAtCoinsEarned).toBeGreaterThan(0);
  });

  it('has the expected starting content (7 ingredients, 4 recipes, 5 upgrades)', () => {
    expect(INGREDIENTS).toHaveLength(7);
    expect(RECIPES).toHaveLength(4);
    expect(UPGRADES).toHaveLength(5);
    expect(STARTING.coins).toBe(50);
  });
});

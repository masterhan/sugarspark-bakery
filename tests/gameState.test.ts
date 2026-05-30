import { describe, expect, it } from 'vitest';
import { GameState } from '../src/state/GameState';
import { getRecipe } from '../src/data/recipes';

describe('GameState', () => {
  it('starts with the PRD §5.4 starting state', () => {
    const s = GameState.createNew();
    expect(s.coins).toBe(50);
    expect(s.ovens).toBe(1);
    expect(s.displayCapacity).toBe(6);
    expect(s.day).toBe(1);
    expect(s.getIngredient('flour')).toBe(6);
    expect(s.getIngredient('chocolate')).toBe(2);
    expect(s.unlockedRecipes).toEqual(['cookie', 'cupcake']);
    expect(s.upgradesOwned).toEqual([]);
    expect(s.totalFinished()).toBe(0);
  });

  it('knows whether it can bake a recipe from current ingredients', () => {
    const s = GameState.createNew();
    expect(s.hasIngredientsFor(getRecipe('cookie'))).toBe(true);
    // Pie needs 2 fruit; starting state has exactly 2 — should pass.
    expect(s.hasIngredientsFor(getRecipe('pie'))).toBe(true);
    // Drain fruit; pie should now be unbakeable.
    s.ingredients.fruit = 0;
    expect(s.hasIngredientsFor(getRecipe('pie'))).toBe(false);
  });

  it('round-trips through save/load without data loss', () => {
    const s = GameState.createNew();
    s.coins = 142;
    s.coinsEarnedTotal = 300;
    s.day = 3;
    s.finishedGoods.cookie = 4;
    s.unlockedRecipes.push('pie');
    s.upgradesOwned.push('speedyOven');

    const restored = GameState.fromSave(s.toSave());
    expect(restored.coins).toBe(142);
    expect(restored.coinsEarnedTotal).toBe(300);
    expect(restored.day).toBe(3);
    expect(restored.getFinished('cookie')).toBe(4);
    expect(restored.unlockedRecipes).toContain('pie');
    expect(restored.hasUpgrade('speedyOven')).toBe(true);
  });

  it('fills missing ingredient keys with 0 when loading an old save', () => {
    const s = GameState.createNew();
    const save = s.toSave();
    // Simulate a save written before "milk" existed.
    delete (save.ingredients as Record<string, number>).milk;
    const restored = GameState.fromSave(save);
    expect(restored.getIngredient('milk')).toBe(0);
  });
});

import { RECIPES } from '../config/balance';
import type { Recipe, TreatId } from './types';

/** All recipes, in display/unlock order. Numbers come from balance.ts. */
export const recipes: readonly Recipe[] = RECIPES;

/** Fast lookup by id. */
export const recipeById: ReadonlyMap<TreatId, Recipe> = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: TreatId): Recipe {
  const def = recipeById.get(id);
  if (!def) throw new Error(`Unknown recipe: ${id}`);
  return def;
}

/** All treat ids, in display order. */
export const treatIds: readonly TreatId[] = RECIPES.map((r) => r.id);

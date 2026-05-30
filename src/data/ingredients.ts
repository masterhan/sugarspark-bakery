import { INGREDIENTS } from '../config/balance';
import type { IngredientDef, IngredientId } from './types';

/** All ingredients, in display order. Numbers come from balance.ts. */
export const ingredients: readonly IngredientDef[] = INGREDIENTS;

/** Fast lookup by id. */
export const ingredientById: ReadonlyMap<IngredientId, IngredientDef> = new Map(
  INGREDIENTS.map((i) => [i.id, i]),
);

export function getIngredient(id: IngredientId): IngredientDef {
  const def = ingredientById.get(id);
  if (!def) throw new Error(`Unknown ingredient: ${id}`);
  return def;
}

/** All ingredient ids, in display order. */
export const ingredientIds: readonly IngredientId[] = INGREDIENTS.map((i) => i.id);

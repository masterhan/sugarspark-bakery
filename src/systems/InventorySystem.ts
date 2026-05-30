import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { IngredientId, Recipe, TreatId } from '../data/types';

/**
 * The two inventories: raw ingredients (consumed by baking) and finished goods
 * (produced by baking, consumed by sales). All counts stay non-negative integers.
 */
export class InventorySystem {
  constructor(
    private readonly state: GameState,
    private readonly bus: TypedEmitter = EventBus,
  ) {}

  /** Consume a recipe's ingredients. Returns false (changing nothing) if any are short. */
  consumeIngredients(recipe: Recipe): boolean {
    if (!this.state.hasIngredientsFor(recipe)) return false;
    for (const [id, amount] of Object.entries(recipe.ingredients)) {
      this.state.ingredients[id as IngredientId] -= amount ?? 0;
    }
    this.bus.emit('INGREDIENTS_CHANGED');
    return true;
  }

  addIngredient(id: IngredientId, amount: number): void {
    if (amount <= 0) return;
    this.state.ingredients[id] += amount;
    this.bus.emit('INGREDIENTS_CHANGED');
  }

  addFinished(treatId: TreatId, amount: number): void {
    if (amount <= 0) return;
    this.state.finishedGoods[treatId] += amount;
    this.bus.emit('FINISHED_GOODS_CHANGED');
  }

  /** Sell/remove finished goods. Returns false (changing nothing) if not enough in stock. */
  removeFinished(treatId: TreatId, amount = 1): boolean {
    if (amount <= 0 || this.state.finishedGoods[treatId] < amount) return false;
    this.state.finishedGoods[treatId] -= amount;
    this.bus.emit('FINISHED_GOODS_CHANGED');
    return true;
  }

  /**
   * How many finished treats are "out on display" (the rest wait in back and auto-refill
   * the display as items sell). Display capacity caps the visible count, never the total.
   */
  displayCount(treatId: TreatId): number {
    return Math.min(this.state.finishedGoods[treatId], this.state.displayCapacity);
  }
}

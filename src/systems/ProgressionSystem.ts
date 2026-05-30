import { DAYS, SAFETY_NET } from '../config/balance';
import { ingredientIds } from '../data/ingredients';
import { recipes } from '../data/recipes';
import type { IngredientId } from '../data/types';
import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { InventorySystem } from './InventorySystem';

/**
 * Growth & pacing: unlock recipes at coin milestones, advance soft "days" for celebration,
 * and the low-coin safety net so the player can always climb back up. All checks are cheap
 * polls run from the game's tick — never a penalty, only nudges forward.
 */
export class ProgressionSystem {
  constructor(
    private readonly state: GameState,
    private readonly inventory: InventorySystem,
    private readonly bus: TypedEmitter = EventBus,
  ) {}

  tick(): void {
    this.checkUnlocks();
    this.checkDay();
    this.checkSafetyNet();
  }

  /** Unlock any recipe whose lifetime-earned threshold has been reached. */
  checkUnlocks(): void {
    for (const recipe of recipes) {
      if (
        !this.state.isRecipeUnlocked(recipe.id) &&
        this.state.coinsEarnedTotal >= recipe.unlockAtCoinsEarned
      ) {
        this.state.unlockedRecipes.push(recipe.id);
        this.bus.emit('RECIPE_UNLOCKED', { recipeId: recipe.id });
      }
    }
  }

  /** Advance a soft day every N sales. Pacing/delight only — never a penalty. */
  checkDay(): void {
    const day = Math.floor(this.state.salesTotal / DAYS.salesPerDay) + 1;
    if (day > this.state.day) {
      this.state.day = day;
      this.bus.emit('DAY_ADVANCED', { day });
    }
  }

  /** If broke AND out of ingredients, gift a starter pack once per day. */
  checkSafetyNet(): void {
    const totalIngredients = ingredientIds.reduce(
      (sum, id) => sum + this.state.getIngredient(id),
      0,
    );
    if (
      this.state.coins < SAFETY_NET.coinsThreshold &&
      totalIngredients === 0 &&
      this.state.lastSafetyNetDay !== this.state.day
    ) {
      for (const [id, amount] of Object.entries(SAFETY_NET.grant)) {
        this.inventory.addIngredient(id as IngredientId, amount ?? 0);
      }
      this.state.lastSafetyNetDay = this.state.day;
      this.bus.emit('SAFETY_NET_GRANTED');
    }
  }
}

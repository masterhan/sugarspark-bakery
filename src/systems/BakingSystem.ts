import { UPGRADES } from '../config/balance';
import { getRecipe } from '../data/recipes';
import type { TreatId } from '../data/types';
import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { InventorySystem } from './InventorySystem';

export type OvenSlot =
  | { status: 'idle' }
  | { status: 'baking'; recipeId: TreatId; totalMs: number; elapsedMs: number };

const SPEEDY = UPGRADES.find((u) => u.id === 'speedyOven');
const SPEEDY_MULTIPLIER =
  SPEEDY && SPEEDY.effect.kind === 'bakeSpeedMultiplier' ? SPEEDY.effect.multiplier : 1;

/**
 * Ovens are the constraint: each oven bakes one batch at a time. Time-driven via tick(),
 * which keeps it fully unit-testable (tests advance time by passing deltas).
 */
export class BakingSystem {
  readonly ovens: OvenSlot[];

  constructor(
    private readonly state: GameState,
    private readonly inventory: InventorySystem,
    private readonly bus: TypedEmitter = EventBus,
  ) {
    this.ovens = Array.from({ length: state.ovens }, () => ({ status: 'idle' }) as OvenSlot);
  }

  /** Keep oven slots in sync with the (upgrade-able) oven count. */
  syncOvenCount(): void {
    while (this.ovens.length < this.state.ovens) this.ovens.push({ status: 'idle' });
  }

  firstFreeOven(): number {
    return this.ovens.findIndex((o) => o.status === 'idle');
  }

  bakeDurationMs(recipeId: TreatId): number {
    const seconds = getRecipe(recipeId).bakeTimeSeconds;
    const factor = this.state.hasUpgrade('speedyOven') ? SPEEDY_MULTIPLIER : 1;
    return seconds * 1000 * factor;
  }

  /**
   * Start baking on the first free oven. Returns the oven index, or null if no free oven
   * or not enough ingredients (caller should have disabled the button — never an error).
   */
  startBake(recipeId: TreatId): number | null {
    const oven = this.firstFreeOven();
    if (oven < 0) return null;
    const recipe = getRecipe(recipeId);
    if (!this.inventory.consumeIngredients(recipe)) return null;

    const totalMs = this.bakeDurationMs(recipeId);
    this.ovens[oven] = { status: 'baking', recipeId, totalMs, elapsedMs: 0 };
    this.bus.emit('BAKE_STARTED', { ovenIndex: oven, recipeId, durationSeconds: totalMs / 1000 });
    return oven;
  }

  /** Advance all baking ovens by deltaMs; finished batches go to inventory. */
  tick(deltaMs: number): void {
    this.ovens.forEach((oven, i) => {
      if (oven.status !== 'baking') return;
      oven.elapsedMs += deltaMs;
      if (oven.elapsedMs < oven.totalMs) return;

      const recipe = getRecipe(oven.recipeId);
      this.inventory.addFinished(oven.recipeId, recipe.batchSize);
      this.bus.emit('BAKE_COMPLETE', {
        ovenIndex: i,
        recipeId: oven.recipeId,
        amount: recipe.batchSize,
      });
      this.ovens[i] = { status: 'idle' };
    });
  }

  /** 0..1 progress for the UI ring; 0 for an idle oven. */
  progress(ovenIndex: number): number {
    const oven = this.ovens[ovenIndex];
    if (!oven || oven.status !== 'baking') return 0;
    return Math.min(1, oven.elapsedMs / oven.totalMs);
  }
}

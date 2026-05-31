import { STARTING } from '../config/balance';
import { ingredientIds } from '../data/ingredients';
import { treatIds } from '../data/recipes';
import type { IngredientId, Recipe, TreatId, UpgradeId } from '../data/types';

export const SCHEMA_VERSION = 1;

export type IngredientCounts = Record<IngredientId, number>;
export type FinishedGoodCounts = Record<TreatId, number>;

export interface GameSettings {
  muted: boolean;
}

/** The plain, serializable save shape (mirrors PRD §10). */
export interface SaveData {
  schemaVersion: number;
  bakeryName: string;
  bakerName: string;
  coins: number;
  coinsEarnedTotal: number;
  day: number;
  salesTotal: number;
  ovens: number;
  displayCapacity: number;
  ingredients: IngredientCounts;
  finishedGoods: FinishedGoodCounts;
  unlockedRecipes: TreatId[];
  upgradesOwned: UpgradeId[];
  lastSafetyNetDay: number;
  settings: GameSettings;
}

function zeroIngredients(): IngredientCounts {
  return Object.fromEntries(ingredientIds.map((id) => [id, 0])) as IngredientCounts;
}

function zeroFinishedGoods(): FinishedGoodCounts {
  return Object.fromEntries(treatIds.map((id) => [id, 0])) as FinishedGoodCounts;
}

/**
 * The single source of truth for game state. Mutated ONLY through system methods,
 * never directly from UI/rendering. Phaser-free and fully unit-testable.
 */
export class GameState {
  schemaVersion = SCHEMA_VERSION;
  bakeryName = 'My Bakery';
  bakerName = 'Baker';
  coins: number = STARTING.coins;
  /** Lifetime coins earned — drives recipe unlock thresholds (NOT current balance). */
  coinsEarnedTotal = 0;
  day = 1;
  salesTotal = 0;
  ovens: number = STARTING.ovens;
  displayCapacity: number = STARTING.displayCapacity;
  ingredients: IngredientCounts = zeroIngredients();
  finishedGoods: FinishedGoodCounts = zeroFinishedGoods();
  unlockedRecipes: TreatId[] = [...STARTING.unlockedRecipes];
  upgradesOwned: UpgradeId[] = [];
  /** Day on which the low-coin safety net last fired (0 = never). */
  lastSafetyNetDay = 0;
  settings: GameSettings = { muted: false };

  /** Fresh game with PRD §5.4 starting state (optionally with chosen bakery/baker names). */
  static createNew(names?: { bakeryName: string; bakerName: string }): GameState {
    const s = new GameState();
    s.ingredients = { ...zeroIngredients(), ...STARTING.ingredients };
    if (names) {
      s.bakeryName = names.bakeryName;
      s.bakerName = names.bakerName;
    }
    return s;
  }

  // ── Queries (read-only; safe to call from anywhere) ───────────────────────

  getIngredient(id: IngredientId): number {
    return this.ingredients[id];
  }

  getFinished(id: TreatId): number {
    return this.finishedGoods[id];
  }

  /** Total finished treats across all types (display + back stock). */
  totalFinished(): number {
    return treatIds.reduce((sum, id) => sum + this.finishedGoods[id], 0);
  }

  /** True if we have every ingredient a recipe needs, in sufficient quantity. */
  hasIngredientsFor(recipe: Recipe): boolean {
    return Object.entries(recipe.ingredients).every(
      ([id, amount]) => this.ingredients[id as IngredientId] >= (amount ?? 0),
    );
  }

  isRecipeUnlocked(id: TreatId): boolean {
    return this.unlockedRecipes.includes(id);
  }

  hasUpgrade(id: UpgradeId): boolean {
    return this.upgradesOwned.includes(id);
  }

  // ── Serialization (used by SaveSystem) ────────────────────────────────────

  toSave(): SaveData {
    return {
      schemaVersion: this.schemaVersion,
      bakeryName: this.bakeryName,
      bakerName: this.bakerName,
      coins: this.coins,
      coinsEarnedTotal: this.coinsEarnedTotal,
      day: this.day,
      salesTotal: this.salesTotal,
      ovens: this.ovens,
      displayCapacity: this.displayCapacity,
      ingredients: { ...this.ingredients },
      finishedGoods: { ...this.finishedGoods },
      unlockedRecipes: [...this.unlockedRecipes],
      upgradesOwned: [...this.upgradesOwned],
      lastSafetyNetDay: this.lastSafetyNetDay,
      settings: { ...this.settings },
    };
  }

  /** Rebuild a GameState from a (already-migrated) save object. */
  static fromSave(data: SaveData): GameState {
    const s = new GameState();
    s.schemaVersion = data.schemaVersion;
    s.bakeryName = data.bakeryName;
    s.bakerName = data.bakerName;
    s.coins = data.coins;
    s.coinsEarnedTotal = data.coinsEarnedTotal;
    s.day = data.day;
    s.salesTotal = data.salesTotal;
    s.ovens = data.ovens;
    s.displayCapacity = data.displayCapacity;
    // Merge over zeroed defaults so missing keys (e.g. a new ingredient) default to 0.
    s.ingredients = { ...zeroIngredients(), ...data.ingredients };
    s.finishedGoods = { ...zeroFinishedGoods(), ...data.finishedGoods };
    s.unlockedRecipes = [...data.unlockedRecipes];
    s.upgradesOwned = [...data.upgradesOwned];
    s.lastSafetyNetDay = data.lastSafetyNetDay;
    s.settings = { ...data.settings };
    return s;
  }
}

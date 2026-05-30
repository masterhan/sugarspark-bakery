// Shared types for all game content. No runtime values live here — only shapes.
// Numbers live in src/config/balance.ts; lookups/maps live in the sibling data files.

export type IngredientId = 'flour' | 'sugar' | 'milk' | 'egg' | 'butter' | 'fruit' | 'chocolate';

export type TreatId = 'cookie' | 'cupcake' | 'pie' | 'cake';

export type UpgradeId =
  | 'secondOven'
  | 'speedyOven'
  | 'biggerDisplay'
  | 'cheerySign'
  | 'decorations';

export type CustomerTypeId = 'child' | 'parent' | 'grandparent' | 'cat' | 'bunny' | 'bear';

/** How many of each ingredient something needs/costs. Sparse by design. */
export type IngredientAmounts = Partial<Record<IngredientId, number>>;

export interface IngredientDef {
  id: IngredientId;
  displayName: string;
  /** Emoji used by the runtime placeholder art system until real art is dropped in. */
  emoji: string;
  /** Logical art key — maps to a frame in public/assets/manifest.json. */
  assetKey: string;
  /** Buy cost per unit, in coins. */
  cost: number;
}

export interface Recipe {
  id: TreatId;
  displayName: string;
  emoji: string;
  assetKey: string;
  /** Ingredients consumed per bake. */
  ingredients: IngredientAmounts;
  /** Bake duration in seconds (generous, cozy pacing). */
  bakeTimeSeconds: number;
  /** Number of finished treats one bake produces. */
  batchSize: number;
  /** Sell price per treat, in coins. */
  sellPrice: number;
  /** Total coins earned (lifetime) required before this recipe can be unlocked. 0 = available at start. */
  unlockAtCoinsEarned: number;
}

/** Discriminated union of what an upgrade actually does. */
export type UpgradeEffect =
  | { kind: 'addOven'; amount: number }
  | { kind: 'bakeSpeedMultiplier'; multiplier: number }
  | { kind: 'setDisplayCapacity'; capacity: number }
  | { kind: 'arrivalRateMultiplier'; multiplier: number }
  | { kind: 'cosmetic' };

export interface Upgrade {
  id: UpgradeId;
  displayName: string;
  emoji: string;
  assetKey: string;
  /** Short, kid-friendly description of what it does. */
  description: string;
  /** One-time purchase cost, in coins. */
  cost: number;
  effect: UpgradeEffect;
}

export interface CustomerType {
  id: CustomerTypeId;
  displayName: string;
  emoji: string;
  /** Neutral-face art key. */
  assetKey: string;
  /** Happy/eating-face art key. */
  happyAssetKey: string;
}

/**
 * balance.ts — THE single file of tunable numbers (and the §5 starting content).
 *
 * ★★★ NON-TECHNICAL OWNER: this is the ONLY file you edit to rebalance the game. ★★★
 * Change a cost, a bake time, a sell price, how often customers arrive — it's all here.
 * Nothing in the rest of the code hard-codes economy or timing values.
 *
 * Times are in SECONDS so they read the way you think about them ("a cookie bakes in 20").
 * The game converts seconds to milliseconds internally.
 *
 * Values below are the PRD §5 starting balance, designed to be playable and gently
 * profitable on day one.
 */

import type {
  CustomerType,
  IngredientAmounts,
  IngredientDef,
  IngredientId,
  Recipe,
  TreatId,
  Upgrade,
} from '../data/types';

// ─────────────────────────────────────────────────────────────────────────────
// 5.1 Ingredients — buy cost per unit (coins)
// ─────────────────────────────────────────────────────────────────────────────
export const INGREDIENTS: readonly IngredientDef[] = [
  { id: 'flour', displayName: 'Flour', emoji: '🌾', assetKey: 'ingredient_flour', cost: 1 },
  { id: 'sugar', displayName: 'Sugar', emoji: '🧂', assetKey: 'ingredient_sugar', cost: 1 },
  { id: 'milk', displayName: 'Milk', emoji: '🥛', assetKey: 'ingredient_milk', cost: 2 },
  { id: 'egg', displayName: 'Egg', emoji: '🥚', assetKey: 'ingredient_egg', cost: 2 },
  { id: 'butter', displayName: 'Butter', emoji: '🧈', assetKey: 'ingredient_butter', cost: 2 },
  { id: 'fruit', displayName: 'Fruit', emoji: '🍓', assetKey: 'ingredient_fruit', cost: 3 },
  {
    id: 'chocolate',
    displayName: 'Chocolate',
    emoji: '🍫',
    assetKey: 'ingredient_chocolate',
    cost: 3,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5.2 Recipes
// ─────────────────────────────────────────────────────────────────────────────
export const RECIPES: readonly Recipe[] = [
  {
    id: 'cookie',
    displayName: 'Cookie',
    emoji: '🍪',
    assetKey: 'treat_cookie',
    ingredients: { flour: 2, sugar: 1, chocolate: 1 },
    bakeTimeSeconds: 20,
    batchSize: 4,
    sellPrice: 5,
    unlockAtCoinsEarned: 0,
  },
  {
    id: 'cupcake',
    displayName: 'Cupcake',
    emoji: '🧁',
    assetKey: 'treat_cupcake',
    ingredients: { flour: 1, sugar: 1, egg: 1, butter: 1 },
    bakeTimeSeconds: 30,
    batchSize: 3,
    sellPrice: 8,
    unlockAtCoinsEarned: 0,
  },
  {
    id: 'pie',
    displayName: 'Pie',
    emoji: '🥧',
    assetKey: 'treat_pie',
    ingredients: { flour: 2, butter: 1, fruit: 2 },
    bakeTimeSeconds: 45,
    batchSize: 2,
    sellPrice: 14,
    unlockAtCoinsEarned: 150,
  },
  {
    id: 'cake',
    displayName: 'Cake',
    emoji: '🎂',
    assetKey: 'treat_cake',
    ingredients: { flour: 2, sugar: 2, egg: 2, butter: 1, chocolate: 1 },
    bakeTimeSeconds: 60,
    batchSize: 1,
    sellPrice: 25,
    unlockAtCoinsEarned: 400,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5.3 Upgrades — one-time purchases
// ─────────────────────────────────────────────────────────────────────────────
export const UPGRADES: readonly Upgrade[] = [
  {
    id: 'secondOven',
    displayName: 'Second Oven',
    emoji: '🔥',
    assetKey: 'env_oven',
    description: 'Bake two batches at once!',
    cost: 200,
    effect: { kind: 'addOven', amount: 1 },
  },
  {
    id: 'speedyOven',
    displayName: 'Speedy Oven',
    emoji: '⚡',
    assetKey: 'ui_speedy',
    description: 'All baking is 30% faster.',
    cost: 150,
    effect: { kind: 'bakeSpeedMultiplier', multiplier: 0.7 },
  },
  {
    id: 'biggerDisplay',
    displayName: 'Bigger Display',
    emoji: '🪟',
    assetKey: 'env_display',
    description: 'Show 12 treats at once instead of 6.',
    cost: 120,
    effect: { kind: 'setDisplayCapacity', capacity: 12 },
  },
  {
    id: 'cheerySign',
    displayName: 'Cheery Sign',
    emoji: '🪧',
    assetKey: 'ui_sign',
    description: 'Customers come about 30% more often.',
    cost: 180,
    effect: { kind: 'arrivalRateMultiplier', multiplier: 0.7 },
  },
  {
    id: 'decorations',
    displayName: 'Decorations Pack',
    emoji: '🎀',
    assetKey: 'ui_decorations',
    description: 'Pretty themes for your shop.',
    cost: 100,
    effect: { kind: 'cosmetic' },
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5.5 Customer cosmetic variants (≥6) — purely for charm, no gameplay effect
// ─────────────────────────────────────────────────────────────────────────────
export const CUSTOMER_TYPES: readonly CustomerType[] = [
  {
    id: 'child',
    displayName: 'Child',
    emoji: '🧒',
    assetKey: 'customer_child',
    happyAssetKey: 'customer_child_happy',
  },
  {
    id: 'parent',
    displayName: 'Parent',
    emoji: '🧑',
    assetKey: 'customer_parent',
    happyAssetKey: 'customer_parent_happy',
  },
  {
    id: 'grandparent',
    displayName: 'Grandparent',
    emoji: '👵',
    assetKey: 'customer_grandparent',
    happyAssetKey: 'customer_grandparent_happy',
  },
  {
    id: 'cat',
    displayName: 'Cat',
    emoji: '🐱',
    assetKey: 'customer_cat',
    happyAssetKey: 'customer_cat_happy',
  },
  {
    id: 'bunny',
    displayName: 'Bunny',
    emoji: '🐰',
    assetKey: 'customer_bunny',
    happyAssetKey: 'customer_bunny_happy',
  },
  {
    id: 'bear',
    displayName: 'Bear',
    emoji: '🐻',
    assetKey: 'customer_bear',
    happyAssetKey: 'customer_bear_happy',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5.4 Starting state
// ─────────────────────────────────────────────────────────────────────────────
export const STARTING = {
  coins: 50,
  ovens: 1,
  displayCapacity: 6,
  ingredients: {
    flour: 6,
    sugar: 4,
    egg: 4,
    butter: 4,
    chocolate: 2,
    fruit: 2,
    milk: 2,
  } satisfies Record<IngredientId, number>,
  unlockedRecipes: ['cookie', 'cupcake'] satisfies TreatId[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5.5 Customers — arrivals, patience, wants, tips
// ─────────────────────────────────────────────────────────────────────────────
export const CUSTOMERS = {
  /** Arrival gap is random in this range (seconds). Cheery Sign multiplies these down. */
  arrivalIntervalSecondsMin: 8,
  arrivalIntervalSecondsMax: 15,
  /** Base patience before a customer happily leaves (seconds). */
  patienceSeconds: 20,
  /** Patience is randomized by ±this fraction (0.2 = ±20%). */
  patienceVariance: 0.2,
  /** Chance a new customer wants something currently in stock (feels good). */
  wantInStockChance: 0.7,
  /** How many customers can be waiting at the counter at once (cozy, never a crowd). */
  maxConcurrent: 3,
  /** Tips reward readiness — never punish slowness. */
  tip: {
    /** Served while patience is above this fraction → +highTip coins. */
    highThreshold: 0.6,
    highTip: 1,
    /** Served while patience is above this fraction → +veryHighTip coins. */
    veryHighThreshold: 0.85,
    veryHighTip: 2,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4.5 Soft "days" — pacing & delight only, never a penalty
// ─────────────────────────────────────────────────────────────────────────────
export const DAYS = {
  /** Advance a "day" (small celebration) every N sales. Tunable; PRD left N open. */
  salesPerDay: 10,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4.4 Low-coin safety net — the game must always offer a path back up
// ─────────────────────────────────────────────────────────────────────────────
export const SAFETY_NET = {
  /** If coins are below this AND ingredients are empty, grant a free starter pack. */
  coinsThreshold: 5,
  /** Granted at most once per day. */
  grant: { flour: 4, sugar: 2, chocolate: 2 } satisfies IngredientAmounts,
} as const;

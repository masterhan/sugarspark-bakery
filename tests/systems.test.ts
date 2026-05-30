import { beforeEach, describe, expect, it } from 'vitest';
import { GameState } from '../src/state/GameState';
import { TypedEmitter } from '../src/events/EventBus';
import { EconomySystem } from '../src/systems/EconomySystem';
import { InventorySystem } from '../src/systems/InventorySystem';
import { BakingSystem } from '../src/systems/BakingSystem';
import { CustomerSystem } from '../src/systems/CustomerSystem';
import { getRecipe } from '../src/data/recipes';

let state: GameState;
let bus: TypedEmitter;

beforeEach(() => {
  state = GameState.createNew();
  bus = new TypedEmitter();
});

describe('EconomySystem', () => {
  it('earns coins and tracks the lifetime total', () => {
    const eco = new EconomySystem(state, bus);
    let fired = 0;
    bus.on('COINS_CHANGED', () => (fired += 1));
    eco.earn(10);
    expect(state.coins).toBe(60);
    expect(state.coinsEarnedTotal).toBe(10);
    expect(fired).toBe(1);
  });

  it('spends only what is affordable; spending does not reduce lifetime earned', () => {
    const eco = new EconomySystem(state, bus);
    eco.earn(10); // coins 60, lifetime 10
    expect(eco.spend(100)).toBe(false);
    expect(state.coins).toBe(60);
    expect(eco.spend(20)).toBe(true);
    expect(state.coins).toBe(40);
    expect(state.coinsEarnedTotal).toBe(10);
  });
});

describe('InventorySystem', () => {
  it('consumes a recipe’s ingredients only when all are present', () => {
    const inv = new InventorySystem(state, bus);
    expect(inv.consumeIngredients(getRecipe('cookie'))).toBe(true);
    expect(state.getIngredient('flour')).toBe(4); // 6 - 2
    expect(state.getIngredient('chocolate')).toBe(1); // 2 - 1

    state.ingredients.flour = 0;
    expect(inv.consumeIngredients(getRecipe('cookie'))).toBe(false);
    expect(state.getIngredient('chocolate')).toBe(1); // unchanged on failure
  });

  it('adds and removes finished goods, and caps the on-display count', () => {
    const inv = new InventorySystem(state, bus);
    inv.addFinished('cookie', 10);
    expect(state.getFinished('cookie')).toBe(10);
    expect(inv.displayCount('cookie')).toBe(6); // displayCapacity = 6
    expect(inv.removeFinished('cookie', 3)).toBe(true);
    expect(state.getFinished('cookie')).toBe(7);
    expect(inv.removeFinished('pie', 1)).toBe(false); // none in stock
  });
});

describe('BakingSystem', () => {
  it('bakes a batch: consumes ingredients, occupies an oven, finishes after the bake time', () => {
    const inv = new InventorySystem(state, bus);
    const baking = new BakingSystem(state, inv, bus);
    expect(baking.ovens).toHaveLength(1);

    const oven = baking.startBake('cookie');
    expect(oven).toBe(0);
    expect(state.getIngredient('flour')).toBe(4);
    expect(baking.firstFreeOven()).toBe(-1); // only oven is busy

    baking.tick(10000); // halfway through 20s
    expect(state.getFinished('cookie')).toBe(0);
    expect(baking.progress(0)).toBeCloseTo(0.5);

    baking.tick(10000); // complete
    expect(state.getFinished('cookie')).toBe(4); // batch size 4
    expect(baking.ovens[0]?.status).toBe('idle');
  });

  it('returns null when there is no free oven (no ingredients consumed)', () => {
    const inv = new InventorySystem(state, bus);
    const baking = new BakingSystem(state, inv, bus);
    baking.startBake('cookie'); // oven now busy
    const flourBefore = state.getIngredient('flour');
    expect(baking.startBake('cupcake')).toBeNull();
    expect(state.getIngredient('flour')).toBe(flourBefore);
  });
});

describe('CustomerSystem', () => {
  function build(rng: () => number) {
    const inv = new InventorySystem(state, bus);
    const eco = new EconomySystem(state, bus);
    const cs = new CustomerSystem(state, inv, eco, bus, rng);
    return { inv, eco, cs };
  }

  it('spawns a customer after the arrival interval', () => {
    const { cs } = build(() => 0.5);
    expect(cs.active).toHaveLength(0);
    cs.tick(20000); // beyond the max ~15s interval
    expect(cs.active).toHaveLength(1);
  });

  it('serving an in-stock treat pays price + tip and records a sale', () => {
    const { inv, cs } = build(() => 0.5);
    inv.addFinished('cookie', 1);
    cs.tick(20000);
    const c = cs.active[0]!;
    expect(c.wantedTreat).toBe('cookie'); // biased to in-stock
    expect(cs.serve(c.id)).toBe(true);
    // Served at full patience → biggest tip (+2). Cookie = 5.
    expect(state.coins).toBe(57);
    expect(state.salesTotal).toBe(1);
    expect(state.getFinished('cookie')).toBe(0);
    expect(cs.active).toHaveLength(0);
  });

  it('cannot serve a treat that is out of stock', () => {
    const { cs } = build(() => 0.5);
    cs.tick(20000);
    const c = cs.active[0]!;
    state.finishedGoods[c.wantedTreat] = 0;
    expect(cs.serve(c.id)).toBe(false);
    expect(cs.active).toHaveLength(1); // still waiting
  });

  it('tip rewards readiness by patience fraction', () => {
    const { cs } = build(() => 0.5);
    const base = {
      id: 'x',
      typeId: 'child' as const,
      wantedTreat: 'cookie' as const,
      patienceTotalMs: 1000,
    };
    expect(cs.calcTip({ ...base, patienceRemainingMs: 900 })).toBe(2); // >85%
    expect(cs.calcTip({ ...base, patienceRemainingMs: 700 })).toBe(1); // >60%
    expect(cs.calcTip({ ...base, patienceRemainingMs: 500 })).toBe(0);
  });

  it('a customer whose patience runs out leaves with NO penalty', () => {
    const { cs } = build(() => 0.5);
    cs.tick(12000); // spawn one; arrival timer resets to ~11.5s
    const c = cs.active[0]!;
    const coinsBefore = state.coins;
    let left = false;
    bus.on('CUSTOMER_LEFT_UNSERVED', () => (left = true));
    c.patienceRemainingMs = 5;
    cs.tick(10); // patience expires; too short to spawn another
    expect(cs.active).toHaveLength(0);
    expect(left).toBe(true);
    expect(state.coins).toBe(coinsBefore); // forgiving — nothing lost
  });
});

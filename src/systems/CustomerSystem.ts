import { CUSTOMERS, UPGRADES } from '../config/balance';
import { customerTypes } from '../data/customers';
import { getRecipe } from '../data/recipes';
import type { CustomerTypeId, TreatId } from '../data/types';
import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { EconomySystem } from './EconomySystem';
import type { InventorySystem } from './InventorySystem';

export interface CustomerOrder {
  id: string;
  typeId: CustomerTypeId;
  wantedTreat: TreatId;
  patienceTotalMs: number;
  patienceRemainingMs: number;
}

const CHEERY = UPGRADES.find((u) => u.id === 'cheerySign');
const CHEERY_MULTIPLIER =
  CHEERY && CHEERY.effect.kind === 'arrivalRateMultiplier' ? CHEERY.effect.multiplier : 1;

/**
 * Customers arrive on a gentle timer, want one treat, and wait patiently. Serving pays
 * (plus a tip if they're still happy). If patience runs out they leave happily — no penalty,
 * no lost coins. Time-driven via tick() so it's fully unit-testable.
 */
export class CustomerSystem {
  readonly active: CustomerOrder[] = [];
  private timeToNextMs: number;
  private idCounter = 0;

  constructor(
    private readonly state: GameState,
    private readonly inventory: InventorySystem,
    private readonly economy: EconomySystem,
    private readonly bus: TypedEmitter = EventBus,
    /** Injectable for deterministic tests. */
    private readonly rng: () => number = Math.random,
  ) {
    this.timeToNextMs = this.rollArrivalMs();
  }

  tick(deltaMs: number): void {
    // Drain patience; anyone who hits zero leaves happily.
    for (const c of this.active) c.patienceRemainingMs -= deltaMs;
    const leaving = this.active.filter((c) => c.patienceRemainingMs <= 0);
    for (const c of leaving) {
      this.bus.emit('CUSTOMER_LEFT_UNSERVED', { customerId: c.id });
      const idx = this.active.indexOf(c);
      if (idx >= 0) this.active.splice(idx, 1);
    }

    // Arrivals.
    this.timeToNextMs -= deltaMs;
    if (this.timeToNextMs <= 0) {
      if (this.active.length < CUSTOMERS.maxConcurrent) this.spawn();
      this.timeToNextMs = this.rollArrivalMs();
    }
  }

  /** Serve a customer their wanted treat if it's in stock. Pays price + tip. */
  serve(customerId: string): boolean {
    const c = this.active.find((x) => x.id === customerId);
    if (!c) return false;
    if (!this.inventory.removeFinished(c.wantedTreat, 1)) return false; // not in stock

    const recipe = getRecipe(c.wantedTreat);
    const tip = this.calcTip(c);
    this.economy.earn(recipe.sellPrice + tip);
    this.state.salesTotal += 1;
    this.bus.emit('CUSTOMER_SERVED', {
      customerId: c.id,
      treatId: c.wantedTreat,
      price: recipe.sellPrice,
      tip,
    });
    const idx = this.active.indexOf(c);
    if (idx >= 0) this.active.splice(idx, 1);
    return true;
  }

  /** Tip rewards readiness (served while patient), never punishes slowness. */
  calcTip(c: CustomerOrder): number {
    const frac = c.patienceRemainingMs / c.patienceTotalMs;
    if (frac > CUSTOMERS.tip.veryHighThreshold) return CUSTOMERS.tip.veryHighTip;
    if (frac > CUSTOMERS.tip.highThreshold) return CUSTOMERS.tip.highTip;
    return 0;
  }

  private spawn(): void {
    const wanted = this.pickWant();
    const variance = (this.rng() * 2 - 1) * CUSTOMERS.patienceVariance; // ±variance
    const patienceTotalMs = CUSTOMERS.patienceSeconds * 1000 * (1 + variance);
    const order: CustomerOrder = {
      id: `c${++this.idCounter}`,
      typeId: this.pickType(),
      wantedTreat: wanted,
      patienceTotalMs,
      patienceRemainingMs: patienceTotalMs,
    };
    this.active.push(order);
    this.bus.emit('CUSTOMER_ARRIVED', { customerId: order.id, wantedTreat: wanted });
  }

  private pickWant(): TreatId {
    const unlocked = this.state.unlockedRecipes;
    const inStock = unlocked.filter((t) => this.state.getFinished(t) > 0);
    if (inStock.length > 0 && this.rng() < CUSTOMERS.wantInStockChance) {
      return inStock[Math.floor(this.rng() * inStock.length)]!;
    }
    return unlocked[Math.floor(this.rng() * unlocked.length)]!;
  }

  private pickType(): CustomerTypeId {
    return customerTypes[Math.floor(this.rng() * customerTypes.length)]!.id;
  }

  private rollArrivalMs(): number {
    const factor = this.state.hasUpgrade('cheerySign') ? CHEERY_MULTIPLIER : 1;
    const min = CUSTOMERS.arrivalIntervalSecondsMin * factor;
    const max = CUSTOMERS.arrivalIntervalSecondsMax * factor;
    return (min + this.rng() * (max - min)) * 1000;
  }
}

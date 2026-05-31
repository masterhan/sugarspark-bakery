import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { IngredientId, TreatId, UpgradeId } from '../data/types';
import { BakingSystem } from '../systems/BakingSystem';
import { CustomerSystem } from '../systems/CustomerSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { ShopSystem } from '../systems/ShopSystem';
import { GameState } from './GameState';

/**
 * The game's brain: owns the single GameState and every system, behind one `tick()` and a
 * few high-level actions. The on-screen scene AND the automated play-through test drive the
 * exact same controller — so what's tested is what ships.
 */
export class GameController {
  readonly state: GameState;
  readonly inventory: InventorySystem;
  readonly economy: EconomySystem;
  readonly baking: BakingSystem;
  readonly customers: CustomerSystem;
  readonly progression: ProgressionSystem;
  readonly shop: ShopSystem;

  constructor(
    bus: TypedEmitter = EventBus,
    rng: () => number = Math.random,
    state: GameState = GameState.createNew(),
  ) {
    this.state = state;
    this.inventory = new InventorySystem(this.state, bus);
    this.economy = new EconomySystem(this.state, bus);
    this.baking = new BakingSystem(this.state, this.inventory, bus);
    this.customers = new CustomerSystem(this.state, this.inventory, this.economy, bus, rng);
    this.progression = new ProgressionSystem(this.state, this.inventory, bus);
    this.shop = new ShopSystem(this.state, this.economy, this.inventory, this.baking, bus);
  }

  /** Advance the whole game by deltaMs. */
  tick(deltaMs: number): void {
    this.baking.tick(deltaMs);
    this.customers.tick(deltaMs);
    this.progression.tick();
  }

  bake(recipeId: TreatId): number | null {
    return this.baking.startBake(recipeId);
  }

  serve(customerId: string): boolean {
    return this.customers.serve(customerId);
  }

  buyIngredient(id: IngredientId, qty = 1): boolean {
    return this.shop.buyIngredient(id, qty);
  }

  buyUpgrade(id: UpgradeId): boolean {
    return this.shop.purchaseUpgrade(id);
  }
}

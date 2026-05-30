import { getIngredient } from '../data/ingredients';
import { getUpgrade } from '../data/upgrades';
import type { IngredientId, Upgrade, UpgradeId } from '../data/types';
import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { BakingSystem } from './BakingSystem';
import type { EconomySystem } from './EconomySystem';
import type { InventorySystem } from './InventorySystem';

/**
 * The shop: spend coins on ingredients and one-time upgrades. Upgrade effects are applied
 * here; the systems that read them (baking speed, customer rate) check ownership at use time.
 */
export class ShopSystem {
  constructor(
    private readonly state: GameState,
    private readonly economy: EconomySystem,
    private readonly inventory: InventorySystem,
    private readonly baking: BakingSystem,
    private readonly bus: TypedEmitter = EventBus,
  ) {}

  ingredientCost(id: IngredientId, qty = 1): number {
    return getIngredient(id).cost * qty;
  }

  /** Buy `qty` of an ingredient. Returns false (changing nothing) if too expensive. */
  buyIngredient(id: IngredientId, qty = 1): boolean {
    if (qty <= 0) return false;
    if (!this.economy.spend(this.ingredientCost(id, qty))) return false;
    this.inventory.addIngredient(id, qty);
    return true;
  }

  canBuyUpgrade(id: UpgradeId): boolean {
    return !this.state.hasUpgrade(id) && this.economy.canAfford(getUpgrade(id).cost);
  }

  /** Buy a one-time upgrade and apply its effect. Returns false if owned or unaffordable. */
  purchaseUpgrade(id: UpgradeId): boolean {
    if (this.state.hasUpgrade(id)) return false;
    const upgrade = getUpgrade(id);
    if (!this.economy.spend(upgrade.cost)) return false;
    this.state.upgradesOwned.push(id);
    this.applyEffect(upgrade);
    this.bus.emit('UPGRADE_PURCHASED', { upgradeId: id });
    return true;
  }

  private applyEffect(upgrade: Upgrade): void {
    const effect = upgrade.effect;
    switch (effect.kind) {
      case 'addOven':
        this.state.ovens += effect.amount;
        this.baking.syncOvenCount();
        break;
      case 'setDisplayCapacity':
        this.state.displayCapacity = effect.capacity;
        break;
      // Read at use time by BakingSystem / CustomerSystem — nothing to apply here.
      case 'bakeSpeedMultiplier':
      case 'arrivalRateMultiplier':
      case 'cosmetic':
        break;
    }
  }
}

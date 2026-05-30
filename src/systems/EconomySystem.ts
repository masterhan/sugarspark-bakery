import { EventBus, type TypedEmitter } from '../events/EventBus';
import type { GameState } from '../state/GameState';

/**
 * Coins in and out. Earning bumps the lifetime total (which drives recipe unlocks);
 * spending never reduces it. The game is forgiving — you can reach 0 coins and recover.
 */
export class EconomySystem {
  constructor(
    private readonly state: GameState,
    private readonly bus: TypedEmitter = EventBus,
  ) {}

  earn(amount: number): void {
    if (amount <= 0) return;
    this.state.coins += amount;
    this.state.coinsEarnedTotal += amount;
    this.bus.emit('COINS_CHANGED', { coins: this.state.coins, delta: amount });
  }

  canAfford(amount: number): boolean {
    return this.state.coins >= amount;
  }

  /** Spend if affordable. Returns false (and changes nothing) if too expensive. */
  spend(amount: number): boolean {
    if (amount < 0 || this.state.coins < amount) return false;
    this.state.coins -= amount;
    this.bus.emit('COINS_CHANGED', { coins: this.state.coins, delta: -amount });
    return true;
  }
}

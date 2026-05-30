import type { TreatId, UpgradeId } from '../data/types';

/**
 * Typed event payloads. Systems communicate through these — they never reach into
 * each other or into rendering directly. Rendering (scenes) subscribes and reacts.
 *
 * Deliberately Phaser-free so the whole game-logic layer is unit-testable in plain Node.
 */
export interface GameEvents {
  COINS_CHANGED: { coins: number; delta: number };
  INGREDIENTS_CHANGED: undefined;
  FINISHED_GOODS_CHANGED: undefined;
  BAKE_STARTED: { ovenIndex: number; recipeId: TreatId; durationSeconds: number };
  BAKE_COMPLETE: { ovenIndex: number; recipeId: TreatId; amount: number };
  CUSTOMER_ARRIVED: { customerId: string; wantedTreat: TreatId };
  CUSTOMER_SERVED: { customerId: string; treatId: TreatId; price: number; tip: number };
  CUSTOMER_LEFT_UNSERVED: { customerId: string };
  RECIPE_UNLOCKED: { recipeId: TreatId };
  UPGRADE_PURCHASED: { upgradeId: UpgradeId };
  DAY_ADVANCED: { day: number };
  SAFETY_NET_GRANTED: undefined;
  STATE_LOADED: undefined;
}

export type GameEventName = keyof GameEvents;
type Handler<K extends GameEventName> = (payload: GameEvents[K]) => void;

/**
 * Tiny typed publish/subscribe bus. One shared instance lives in EventBus (below);
 * tests can `new TypedEmitter()` for isolation.
 */
export class TypedEmitter {
  // Stored loosely ((payload: never)) so the generic methods type-check; the public API stays typed.
  private handlers = new Map<GameEventName, Set<(payload: never) => void>>();

  on<K extends GameEventName>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends GameEventName>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends GameEventName>(
    event: K,
    ...args: GameEvents[K] extends undefined ? [] : [GameEvents[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    const payload = args[0] as never;
    // Copy to a list so handlers can safely unsubscribe during dispatch.
    for (const handler of [...set]) handler(payload);
  }

  /** Remove every listener (useful between scenes / on teardown). */
  clear(): void {
    this.handlers.clear();
  }
}

/** Shared app-wide event bus. */
export const EventBus = new TypedEmitter();

import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { getRecipe, treatIds } from '../data/recipes';
import type { TreatId } from '../data/types';
import { EventBus } from '../events/EventBus';
import { GameState } from '../state/GameState';
import { BakingSystem } from '../systems/BakingSystem';
import { CustomerSystem } from '../systems/CustomerSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { Oven } from '../entities/Oven';
import { CustomerSprite } from '../entities/CustomerSprite';
import { BakePanel } from '../ui/BakePanel';
import { Button } from '../ui/Button';
import { prefersReducedMotion } from '../utils/motion';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

interface Slot {
  x: number;
  y: number;
  taken: boolean;
}

/**
 * The bakery. Wires the (Phaser-free) systems to visuals: tap Bake to bake, finished
 * treats appear on the display, customers slide in wanting a treat, tap to serve.
 * Rendering reacts to events; it never mutates state directly (PRD §9.2).
 */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private inventory!: InventorySystem;
  private economy!: EconomySystem;
  private baking!: BakingSystem;
  private customers!: CustomerSystem;

  private ovens: Oven[] = [];
  private customerSprites = new Map<string, CustomerSprite>();
  private slotByCustomer = new Map<string, number>();
  private slots: Slot[] = [];
  private displayContainer!: Phaser.GameObjects.Container;
  private bakePanel?: BakePanel;
  private offHandlers: Array<() => void> = [];

  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;

    EventBus.clear(); // fresh listeners for this play session
    this.state = GameState.createNew();
    this.registry.set('state', this.state);

    this.inventory = new InventorySystem(this.state, EventBus);
    this.economy = new EconomySystem(this.state, EventBus);
    this.baking = new BakingSystem(this.state, this.inventory, EventBus);
    this.customers = new CustomerSystem(this.state, this.inventory, this.economy, EventBus);

    // Scene dressing.
    this.add.image(width / 2, height / 2, 'env_background').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height * 0.86, width, height * 0.3, 0x000000, 0.04);
    this.add.image(width * 0.5, height * 0.5, 'env_display').setScale(1.15);
    this.add.image(width * 0.85, height * 0.55, 'env_register').setScale(0.7);

    this.createOvens();

    // Finished treats sit on the display case.
    this.displayContainer = this.add.container(width * 0.5, height * 0.46);
    this.renderDisplay();

    // Counter slots for waiting customers (matches CUSTOMERS.maxConcurrent).
    this.slots = [
      { x: width * 0.34, y: height * 0.72, taken: false },
      { x: width * 0.5, y: height * 0.74, taken: false },
      { x: width * 0.66, y: height * 0.72, taken: false },
    ];

    new Button(this, width * 0.16, height * 0.92, {
      label: 'Bake',
      icon: '🧑‍🍳',
      width: 210,
      height: 84,
      bgColor: hex(PALETTE.frostingPink),
      onClick: () => this.openBakePanel(),
    });

    this.offHandlers.push(
      EventBus.on('BAKE_COMPLETE', (p: { ovenIndex: number }) => this.ovens[p.ovenIndex]?.bounce()),
      EventBus.on('FINISHED_GOODS_CHANGED', () => this.renderDisplay()),
      EventBus.on('CUSTOMER_ARRIVED', (p: { customerId: string }) =>
        this.onCustomerArrived(p.customerId),
      ),
      EventBus.on('CUSTOMER_SERVED', (p: { customerId: string; price: number; tip: number }) =>
        this.onCustomerServed(p.customerId, p.price + p.tip),
      ),
      EventBus.on('CUSTOMER_LEFT_UNSERVED', (p: { customerId: string }) =>
        this.onCustomerLeft(p.customerId),
      ),
    );

    this.scene.launch('UI');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offHandlers.forEach((off) => off());
      this.offHandlers = [];
    });
  }

  update(_time: number, delta: number): void {
    if (!this.baking) return;
    this.baking.tick(delta);
    this.customers.tick(delta);

    this.ovens.forEach((oven: Oven, i: number) => oven.setProgress(this.baking.progress(i)));
    for (const order of this.customers.active) {
      this.customerSprites
        .get(order.id)
        ?.setPatience(order.patienceRemainingMs / order.patienceTotalMs);
    }
  }

  private createOvens(): void {
    const { width, height } = this.scale;
    const startX = width * 0.18;
    for (let i = 0; i < this.state.ovens; i++) {
      this.ovens.push(new Oven(this, startX + i * 190, height * 0.5));
    }
  }

  private renderDisplay(): void {
    this.displayContainer.removeAll(true);
    const inStock: TreatId[] = treatIds.filter((t: TreatId) => this.state.getFinished(t) > 0);
    let x = -((inStock.length - 1) * 92) / 2;
    for (const t of inStock) {
      this.displayContainer.add(this.add.image(x, 0, getRecipe(t).assetKey).setDisplaySize(64, 64));
      this.displayContainer.add(
        this.add
          .text(x + 22, 22, `×${this.state.getFinished(t)}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '20px',
            color: '#7A4A26',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      x += 92;
    }
  }

  private openBakePanel(): void {
    if (this.bakePanel) return;
    this.bakePanel = new BakePanel(this, this.state, this.baking, () => {
      this.bakePanel?.destroy();
      this.bakePanel = undefined;
    });
  }

  private onCustomerArrived(customerId: string): void {
    const order = this.customers.active.find((o) => o.id === customerId);
    if (!order) return;
    const slotIndex = this.slots.findIndex((s: Slot) => !s.taken);
    if (slotIndex < 0) return;
    const slot = this.slots[slotIndex]!;
    slot.taken = true;
    this.slotByCustomer.set(customerId, slotIndex);

    const sprite = new CustomerSprite(
      this,
      customerId,
      order.typeId,
      order.wantedTreat,
      (id: string) => this.customers.serve(id),
    );
    sprite.walkIn(slot.x, slot.y);
    this.customerSprites.set(customerId, sprite);
  }

  private onCustomerServed(customerId: string, total: number): void {
    const sprite = this.customerSprites.get(customerId);
    if (!sprite) return;
    this.flyCoins(sprite.x, sprite.y, total);
    sprite.celebrateAndLeave(true, () => this.releaseSlot(customerId));
    this.customerSprites.delete(customerId);
  }

  private onCustomerLeft(customerId: string): void {
    const sprite = this.customerSprites.get(customerId);
    if (!sprite) return;
    sprite.celebrateAndLeave(false, () => this.releaseSlot(customerId));
    this.customerSprites.delete(customerId);
  }

  private releaseSlot(customerId: string): void {
    const slotIndex = this.slotByCustomer.get(customerId);
    if (slotIndex === undefined) return;
    const slot = this.slots[slotIndex];
    if (slot) slot.taken = false;
    this.slotByCustomer.delete(customerId);
  }

  private flyCoins(x: number, y: number, total: number): void {
    const coin = this.add.image(x, y, 'ui_coin').setDisplaySize(44, 44).setDepth(500);
    const label = this.add
      .text(x + 28, y, `+${total}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(500);

    if (prefersReducedMotion()) {
      coin.destroy();
      label.destroy();
      return;
    }
    this.tweens.add({
      targets: [coin, label],
      x: 90,
      y: 36,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        coin.destroy();
        label.destroy();
      },
    });
  }
}

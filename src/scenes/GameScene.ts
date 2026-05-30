import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { getRecipe, treatIds } from '../data/recipes';
import { getUpgrade } from '../data/upgrades';
import type { TreatId } from '../data/types';
import { EventBus } from '../events/EventBus';
import { GameController } from '../state/GameController';
import { Oven } from '../entities/Oven';
import { CustomerSprite } from '../entities/CustomerSprite';
import { BakePanel } from '../ui/BakePanel';
import { ShopPanel } from '../ui/ShopPanel';
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
 * The bakery. Drives one GameController (state + every system) and renders it: tap Bake to
 * bake, tap Shop to buy ingredients/upgrades, finished treats appear on the display, customers
 * slide in wanting a treat, tap to serve. Rendering reacts to events; it never mutates state
 * directly (PRD §9.2).
 */
export class GameScene extends Phaser.Scene {
  private controller!: GameController;
  private ovens: Oven[] = [];
  private customerSprites = new Map<string, CustomerSprite>();
  private slotByCustomer = new Map<string, number>();
  private slots: Slot[] = [];
  private displayContainer!: Phaser.GameObjects.Container;
  private bakePanel?: BakePanel;
  private shopPanel?: ShopPanel;
  private offHandlers: Array<() => void> = [];

  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;

    EventBus.clear(); // fresh listeners for this play session
    this.controller = new GameController(EventBus);
    this.registry.set('state', this.controller.state);

    // Scene dressing.
    this.add.image(width / 2, height / 2, 'env_background').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height * 0.86, width, height * 0.3, 0x000000, 0.04);
    this.add.image(width * 0.5, height * 0.5, 'env_display').setScale(1.15);
    this.add.image(width * 0.85, height * 0.5, 'env_register').setScale(0.7);

    this.syncOvens();

    this.displayContainer = this.add.container(width * 0.5, height * 0.46);
    this.renderDisplay();

    this.slots = [
      { x: width * 0.34, y: height * 0.72, taken: false },
      { x: width * 0.5, y: height * 0.74, taken: false },
      { x: width * 0.66, y: height * 0.72, taken: false },
    ];

    new Button(this, width * 0.15, height * 0.92, {
      label: 'Bake',
      icon: '🧑‍🍳',
      width: 200,
      height: 84,
      bgColor: hex(PALETTE.frostingPink),
      onClick: () => this.openBakePanel(),
    });
    new Button(this, width * 0.85, height * 0.92, {
      label: 'Shop',
      icon: '🛒',
      width: 200,
      height: 84,
      bgColor: hex(PALETTE.butterYellow),
      onClick: () => this.openShopPanel(),
    });

    this.offHandlers.push(
      EventBus.on('BAKE_COMPLETE', (p) => this.ovens[p.ovenIndex]?.bounce()),
      EventBus.on('FINISHED_GOODS_CHANGED', () => this.renderDisplay()),
      EventBus.on('CUSTOMER_ARRIVED', (p) => this.onCustomerArrived(p.customerId)),
      EventBus.on('CUSTOMER_SERVED', (p) => this.onCustomerServed(p.customerId, p.price + p.tip)),
      EventBus.on('CUSTOMER_LEFT_UNSERVED', (p) => this.onCustomerLeft(p.customerId)),
      EventBus.on('UPGRADE_PURCHASED', (p) => this.onUpgradePurchased(p.upgradeId)),
      EventBus.on('RECIPE_UNLOCKED', (p) =>
        this.showToast(
          `New recipe: ${getRecipe(p.recipeId).displayName} ${getRecipe(p.recipeId).emoji}!`,
        ),
      ),
      EventBus.on('DAY_ADVANCED', (p) =>
        this.showToast(`Day ${p.day}! Your bakery is getting famous! 🎉`),
      ),
      EventBus.on('SAFETY_NET_GRANTED', () =>
        this.showToast(`A little flour to get you baking again! 🌾`),
      ),
    );

    this.scene.launch('UI');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offHandlers.forEach((off) => off());
      this.offHandlers = [];
    });
  }

  update(_time: number, delta: number): void {
    if (!this.controller) return;
    this.controller.tick(delta);

    this.ovens.forEach((oven, i) => oven.setProgress(this.controller.baking.progress(i)));
    for (const order of this.controller.customers.active) {
      this.customerSprites
        .get(order.id)
        ?.setPatience(order.patienceRemainingMs / order.patienceTotalMs);
    }
  }

  /** Create oven sprites to match the current oven count (grows when a 2nd oven is bought). */
  private syncOvens(): void {
    const { width, height } = this.scale;
    const startX = width * 0.18;
    while (this.ovens.length < this.controller.state.ovens) {
      const i = this.ovens.length;
      this.ovens.push(new Oven(this, startX + i * 190, height * 0.5));
    }
  }

  private renderDisplay(): void {
    this.displayContainer.removeAll(true);
    const inStock: TreatId[] = treatIds.filter((t) => this.controller.state.getFinished(t) > 0);
    let x = -((inStock.length - 1) * 92) / 2;
    for (const t of inStock) {
      this.displayContainer.add(this.add.image(x, 0, getRecipe(t).assetKey).setDisplaySize(64, 64));
      this.displayContainer.add(
        this.add
          .text(x + 22, 22, `×${this.controller.state.getFinished(t)}`, {
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
    if (this.bakePanel || this.shopPanel) return;
    this.bakePanel = new BakePanel(this, this.controller.state, this.controller.baking, () => {
      this.bakePanel?.destroy();
      this.bakePanel = undefined;
    });
  }

  private openShopPanel(): void {
    if (this.bakePanel || this.shopPanel) return;
    this.shopPanel = new ShopPanel(this, this.controller.state, this.controller.shop, () => {
      this.shopPanel?.destroy();
      this.shopPanel = undefined;
    });
  }

  private onUpgradePurchased(upgradeId: ReturnType<typeof getUpgrade>['id']): void {
    this.syncOvens();
    this.showToast(`${getUpgrade(upgradeId).displayName} ${getUpgrade(upgradeId).emoji}!`);
  }

  private onCustomerArrived(customerId: string): void {
    const order = this.controller.customers.active.find((o) => o.id === customerId);
    if (!order) return;
    const slotIndex = this.slots.findIndex((s) => !s.taken);
    if (slotIndex < 0) return;
    const slot = this.slots[slotIndex]!;
    slot.taken = true;
    this.slotByCustomer.set(customerId, slotIndex);

    const sprite = new CustomerSprite(this, customerId, order.typeId, order.wantedTreat, (id) =>
      this.controller.serve(id),
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

  private showToast(message: string): void {
    const { width, height } = this.scale;
    const toast = this.add
      .text(width / 2, height * 0.28, message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#7A4A26',
        fontStyle: 'bold',
        backgroundColor: '#FFF6E9',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(900);

    if (prefersReducedMotion()) {
      this.time.delayedCall(1600, () => toast.destroy());
      return;
    }
    toast.setScale(0.85);
    this.tweens.add({ targets: toast, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => toast.destroy(),
    });
  }
}

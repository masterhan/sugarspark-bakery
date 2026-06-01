import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { pickRandomNames, type BakeryNames } from '../data/names';
import { getRecipe, treatIds } from '../data/recipes';
import { getUpgrade } from '../data/upgrades';
import type { TreatId } from '../data/types';
import { EventBus } from '../events/EventBus';
import { GameController } from '../state/GameController';
import { GameState } from '../state/GameState';
import { SaveSystem } from '../systems/SaveSystem';
import { Oven } from '../entities/Oven';
import { CustomerSprite } from '../entities/CustomerSprite';
import { BakePanel } from '../ui/BakePanel';
import { ShopPanel } from '../ui/ShopPanel';
import { SettingsPanel } from '../ui/SettingsPanel';
import { Button } from '../ui/Button';
import { Coach } from '../ui/Coach';
import { prefersReducedMotion } from '../utils/motion';

/** Steps of the first-time guided onboarding. */
type CoachStep = 'tapBake' | 'pickRecipe' | 'waitBake' | 'serve' | 'done';

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
 * slide in wanting a treat, tap to serve. The game auto-saves and reloads itself.
 * Rendering reacts to events; it never mutates state directly (PRD §9.2).
 */
export class GameScene extends Phaser.Scene {
  private controller!: GameController;
  private saveSystem!: SaveSystem;
  private ovens: Oven[] = [];
  private customerSprites = new Map<string, CustomerSprite>();
  private slotByCustomer = new Map<string, number>();
  private slots: Slot[] = [];
  private displayContainer!: Phaser.GameObjects.Container;
  private bakePanel?: BakePanel;
  private shopPanel?: ShopPanel;
  private settingsPanel?: SettingsPanel;
  private offHandlers: Array<() => void> = [];
  private onVisibility?: () => void;
  private onUnload?: () => void;
  private coach!: Coach;
  private coachStep: CoachStep = 'done';

  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;

    EventBus.clear(); // fresh listeners for this play session

    // Load a saved bakery if there is one; otherwise start fresh with the chosen names.
    this.saveSystem = new SaveSystem();
    const loaded = this.saveSystem.load();
    const state =
      loaded ??
      GameState.createNew(
        (this.registry.get('newGameNames') as BakeryNames | undefined) ?? pickRandomNames(),
      );

    this.controller = new GameController(EventBus, Math.random, state);
    this.registry.set('state', this.controller.state);
    this.sound.mute = this.controller.state.settings.muted;

    // Scene dressing.
    this.add.image(width / 2, height / 2, 'env_background').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height * 0.86, width, height * 0.3, 0x000000, 0.04);
    this.add.image(width * 0.5, height * 0.5, 'env_display').setScale(1.15);
    this.add.image(width * 0.85, height * 0.5, 'env_register').setScale(0.7);

    // Persistent labels so the scene explains itself at a glance (picture-first, PRD §8.3).
    this.stationLabel('Oven', width * 0.18, height * 0.62);
    this.stationLabel('Treats for sale', width * 0.5, height * 0.62);
    this.stationLabel('Cash', width * 0.85, height * 0.62);

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
    new Button(this, width - 56, 116, {
      label: '⚙️',
      width: 56,
      height: 56,
      bgColor: hex(PALETTE.cream),
      onClick: () => this.openSettingsPanel(),
    });

    const queueSave = () => this.saveSystem.scheduleWrite(this.controller.state);

    this.offHandlers.push(
      EventBus.on('BAKE_STARTED', () => {
        // During onboarding, close the panel so the kid sees the oven working + advance the coach.
        // Defer the destroy to the next frame: destroying mid-event (during a render/UV update)
        // tore down a panel text object Phaser was still drawing -> 'drawImage' crash.
        if (this.coachStep === 'pickRecipe') {
          const panel = this.bakePanel;
          this.bakePanel = undefined;
          this.time.delayedCall(0, () => panel?.destroy());
          this.setCoachStep('waitBake');
        }
      }),
      EventBus.on('BAKE_COMPLETE', (p) => {
        this.ovens[p.ovenIndex]?.bounce();
        // Onboarding: treats are ready — if someone's already waiting for one, point at them.
        if (this.coachStep === 'waitBake') {
          const ready = this.controller.customers.active.find(
            (c) => this.controller.state.getFinished(c.wantedTreat) > 0,
          );
          if (ready) this.setCoachStep('serve');
        }
      }),
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
      // Auto-save on every meaningful change (debounced into one write).
      EventBus.on('COINS_CHANGED', queueSave),
      EventBus.on('INGREDIENTS_CHANGED', queueSave),
      EventBus.on('FINISHED_GOODS_CHANGED', queueSave),
      EventBus.on('UPGRADE_PURCHASED', queueSave),
      EventBus.on('RECIPE_UNLOCKED', queueSave),
      EventBus.on('DAY_ADVANCED', queueSave),
      EventBus.on('SAFETY_NET_GRANTED', queueSave),
    );

    // Flush the save when the tab is hidden or closed, so nothing is lost.
    if (typeof window !== 'undefined') {
      this.onVisibility = () => this.saveSystem.flush();
      this.onUnload = () => this.saveSystem.write(this.controller.state);
      window.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('beforeunload', this.onUnload);
    }

    this.scene.launch('UI');

    // Friendly guided onboarding for first-time players (skipped once they've baked before).
    this.coach = new Coach(this);
    this.startOnboarding();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offHandlers.forEach((off) => off());
      this.offHandlers = [];
      this.saveSystem.flush();
      if (typeof window !== 'undefined') {
        if (this.onVisibility) window.removeEventListener('visibilitychange', this.onVisibility);
        if (this.onUnload) window.removeEventListener('beforeunload', this.onUnload);
      }
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

  /** Small caption under a station so the scene reads clearly without instructions. */
  private stationLabel(text: string, x: number, y: number): void {
    this.add
      .text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#7A4A26',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
  }

  // ── First-time guided onboarding ───────────────────────────────────────────

  /** Begin the step-by-step coach, unless this player has clearly played before. */
  private startOnboarding(): void {
    const s = this.controller.state;
    const playedBefore = s.salesTotal > 0 || s.coinsEarnedTotal > 0 || s.day > 1;
    if (playedBefore) {
      this.coachStep = 'done';
      return;
    }
    this.setCoachStep('tapBake');
  }

  private setCoachStep(step: CoachStep): void {
    this.coachStep = step;
    const { width, height } = this.scale;
    switch (step) {
      case 'tapBake':
        this.coach.show('Tap Bake to make yummy treats! 🍪', width * 0.15, height * 0.92 - 50, 'down');
        break;
      case 'pickRecipe':
        this.coach.show('Pick a treat, then tap its Bake button!', width * 0.5, height * 0.2, 'up');
        break;
      case 'waitBake':
        this.coach.show('Yay! Now wait for it to bake… 🔥', width * 0.18, height * 0.62, 'up');
        break;
      case 'serve':
        this.coach.show('A customer! Tap them to give a treat 😋', width * 0.5, height * 0.72, 'down');
        break;
      case 'done':
        this.coach.hide();
        break;
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

  private anyPanelOpen(): boolean {
    return !!(this.bakePanel || this.shopPanel || this.settingsPanel);
  }

  private openBakePanel(): void {
    if (this.anyPanelOpen()) return;
    if (this.coachStep === 'tapBake') this.setCoachStep('pickRecipe');
    this.bakePanel = new BakePanel(this, this.controller.state, this.controller.baking, () => {
      this.bakePanel?.destroy();
      this.bakePanel = undefined;
    });
  }

  private openShopPanel(): void {
    if (this.anyPanelOpen()) return;
    this.shopPanel = new ShopPanel(this, this.controller.state, this.controller.shop, () => {
      this.shopPanel?.destroy();
      this.shopPanel = undefined;
    });
  }

  private openSettingsPanel(): void {
    if (this.anyPanelOpen()) return;
    this.settingsPanel = new SettingsPanel(this, this.controller.state, this.saveSystem, {
      onApplyImport: () => this.restartGame(),
      onStartOver: () => {
        this.scene.stop('UI');
        this.scene.start('Title');
      },
      onClose: () => {
        this.settingsPanel?.destroy();
        this.settingsPanel = undefined;
      },
    });
  }

  /** Reload the scene into whatever save is now on disk (used after importing a backup). */
  private restartGame(): void {
    this.scene.stop('UI');
    this.scene.restart();
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

    // Onboarding: once a treat is in stock and a customer is waiting, point at them.
    if (this.coachStep === 'waitBake' && this.controller.state.getFinished(order.wantedTreat) > 0) {
      this.setCoachStep('serve');
    }
  }

  private onCustomerServed(customerId: string, total: number): void {
    if (this.coachStep === 'serve') this.setCoachStep('done'); // first sale — they've got it
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

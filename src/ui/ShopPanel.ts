import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { ingredients } from '../data/ingredients';
import { upgrades } from '../data/upgrades';
import { EventBus } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { ShopSystem } from '../systems/ShopSystem';
import { Button } from './Button';
import { Panel } from './Panel';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

const BUY_QTY = 5; // ingredients are bought in small bundles to save little fingers some taps.

interface IngredientRow {
  cost: number;
  btn: Button;
}
interface UpgradeRow {
  upgradeId: (typeof upgrades)[number]['id'];
  cost: number;
  btn: Button;
  owned: Phaser.GameObjects.Text;
}

/** Overlay: spend coins on ingredients (left) and one-time upgrades (right). */
export class ShopPanel extends Phaser.GameObjects.Container {
  private ingredientRows: IngredientRow[] = [];
  private upgradeRows: UpgradeRow[] = [];
  private offHandlers: Array<() => void> = [];

  constructor(
    scene: Phaser.Scene,
    private readonly gameState: GameState,
    private readonly shop: ShopSystem,
    private readonly onClose: () => void,
  ) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.setDepth(1000);

    const { width, height } = scene.scale;
    this.add(scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.45).setInteractive());
    this.add(new Panel(scene, 0, 0, 980, 600, 'Shop 🛒'));

    this.add(scene.add.text(-280, -210, 'Ingredients', headerStyle()).setOrigin(0.5));
    ingredients.forEach((ing, i) => {
      const cost = this.shop.ingredientCost(ing.id, BUY_QTY);
      const btn = new Button(scene, -280, -160 + i * 56, {
        label: `${ing.emoji}  ${BUY_QTY} for ${cost}🪙`,
        width: 320,
        height: 48,
        bgColor: hex(PALETTE.mint),
        onClick: () => {
          this.shop.buyIngredient(ing.id, BUY_QTY);
          this.refresh();
        },
      });
      this.add(btn);
      this.ingredientRows.push({ cost, btn });
    });

    this.add(scene.add.text(220, -210, 'Upgrades', headerStyle()).setOrigin(0.5));
    upgrades.forEach((up, i) => {
      const y = -150 + i * 86;
      this.add(scene.add.image(40, y, up.assetKey).setDisplaySize(52, 52));
      this.add(
        scene.add
          .text(78, y - 16, `${up.displayName}  ·  ${up.cost}🪙`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '20px',
            color: '#7A4A26',
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5),
      );
      this.add(
        scene.add
          .text(78, y + 12, up.description, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            color: '#7A4A26',
          })
          .setOrigin(0, 0.5),
      );
      const btn = new Button(scene, 420, y, {
        label: 'Buy',
        width: 96,
        height: 52,
        bgColor: hex(PALETTE.frostingPink),
        onClick: () => {
          this.shop.purchaseUpgrade(up.id);
          this.refresh();
        },
      });
      this.add(btn);
      const owned = scene.add
        .text(420, y, 'Owned ✓', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#7A4A26',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.add(owned);
      this.upgradeRows.push({ upgradeId: up.id, cost: up.cost, btn, owned });
    });

    const close = new Button(scene, 440, -270, {
      label: '✕',
      width: 60,
      height: 60,
      bgColor: hex(PALETTE.chocolateBrown),
      onClick: () => this.onClose(),
    });
    this.add(close);

    this.offHandlers.push(
      EventBus.on('COINS_CHANGED', () => this.refresh()),
      EventBus.on('UPGRADE_PURCHASED', () => this.refresh()),
    );
    this.refresh();

    scene.add.existing(this);
  }

  private refresh(): void {
    for (const row of this.ingredientRows) {
      row.btn.setEnabled(this.gameState.coins >= row.cost);
    }
    for (const row of this.upgradeRows) {
      const owned = this.gameState.hasUpgrade(row.upgradeId);
      row.owned.setVisible(owned);
      row.btn.setVisible(!owned);
      if (!owned) row.btn.setEnabled(this.gameState.coins >= row.cost);
    }
  }

  destroy(fromScene?: boolean): void {
    this.offHandlers.forEach((off) => off());
    this.offHandlers = [];
    super.destroy(fromScene);
  }
}

function headerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '24px',
    color: '#7A4A26',
    fontStyle: 'bold',
  };
}

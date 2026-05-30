import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { getIngredient } from '../data/ingredients';
import { getRecipe } from '../data/recipes';
import type { IngredientId, Recipe } from '../data/types';
import { EventBus } from '../events/EventBus';
import type { GameState } from '../state/GameState';
import type { BakingSystem } from '../systems/BakingSystem';
import { Button } from './Button';
import { Panel } from './Panel';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

interface Row {
  recipe: Recipe;
  bakeBtn: Button;
  hint: Phaser.GameObjects.Text;
}

/** Overlay: pick an unlocked recipe to bake. Friendly blocked states, never errors (PRD §4.1/§8.3). */
export class BakePanel extends Phaser.GameObjects.Container {
  private rows: Row[] = [];
  private offHandlers: Array<() => void> = [];

  constructor(
    scene: Phaser.Scene,
    private readonly gameState: GameState,
    private readonly baking: BakingSystem,
    private readonly onClose: () => void,
  ) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.setDepth(1000);

    const { width, height } = scene.scale;
    const dim = scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.45).setInteractive();
    this.add(dim);

    const panel = new Panel(scene, 0, 0, 940, 560, 'What shall we bake? 🧑‍🍳');
    this.add(panel);

    const recipes = this.gameState.unlockedRecipes.map(getRecipe);
    const top = -150;
    recipes.forEach((recipe, i) => this.buildRow(scene, recipe, top + i * 110));

    const close = new Button(scene, 420, -250, {
      label: '✕',
      width: 60,
      height: 60,
      bgColor: hex(PALETTE.chocolateBrown),
      onClick: () => this.onClose(),
    });
    this.add(close);

    this.offHandlers.push(
      EventBus.on('INGREDIENTS_CHANGED', () => this.refresh()),
      EventBus.on('BAKE_STARTED', () => this.refresh()),
      EventBus.on('BAKE_COMPLETE', () => this.refresh()),
    );
    this.refresh();

    scene.add.existing(this);
  }

  private buildRow(scene: Phaser.Scene, recipe: Recipe, y: number): void {
    this.add(scene.add.image(-410, y, recipe.assetKey).setDisplaySize(72, 72));
    this.add(
      scene.add
        .text(-360, y - 14, recipe.displayName, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: '#7A4A26',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5),
    );
    this.add(
      scene.add
        .text(-360, y + 14, `makes ${recipe.batchSize}  ·  ${recipe.sellPrice} each`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#7A4A26',
        })
        .setOrigin(0, 0.5),
    );

    // Required ingredients (icon + amount).
    let ix = -110;
    for (const [id, amount] of Object.entries(recipe.ingredients)) {
      const def = getIngredient(id as IngredientId);
      this.add(scene.add.image(ix, y, def.assetKey).setDisplaySize(40, 40));
      this.add(
        scene.add
          .text(ix + 24, y, `${amount}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '20px',
            color: '#7A4A26',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      ix += 78;
    }

    const hint = scene.add
      .text(180, y + 36, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#7A4A26',
      })
      .setOrigin(0.5);
    this.add(hint);

    const bakeBtn = new Button(scene, 360, y, {
      label: 'Bake',
      icon: '🔥',
      width: 150,
      height: 64,
      bgColor: hex(PALETTE.frostingPink),
      onClick: () => {
        this.baking.startBake(recipe.id);
        this.refresh();
      },
    });
    this.add(bakeBtn);

    this.rows.push({ recipe, bakeBtn, hint });
  }

  private refresh(): void {
    const freeOven = this.baking.firstFreeOven() >= 0;
    for (const row of this.rows) {
      const hasIngredients = this.gameState.hasIngredientsFor(row.recipe);
      const canBake = hasIngredients && freeOven;
      row.bakeBtn.setEnabled(canBake);

      if (!hasIngredients) {
        const missing = Object.entries(row.recipe.ingredients).find(
          ([id, amt]) => this.gameState.getIngredient(id as IngredientId) < (amt ?? 0),
        );
        const name = missing
          ? getIngredient(missing[0] as IngredientId).displayName
          : 'ingredients';
        row.hint.setText(`Need more ${name}!`);
      } else if (!freeOven) {
        row.hint.setText('Ovens are busy!');
      } else {
        row.hint.setText('');
      }
    }
  }

  destroy(fromScene?: boolean): void {
    this.offHandlers.forEach((off) => off());
    this.offHandlers = [];
    super.destroy(fromScene);
  }
}

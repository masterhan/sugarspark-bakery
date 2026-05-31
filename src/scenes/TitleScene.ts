import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { pickRandomNames, type BakeryNames } from '../data/names';
import { SaveSystem } from '../systems/SaveSystem';
import { Button } from '../ui/Button';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

/**
 * Warm title screen. If a saved bakery exists, offer to continue it; otherwise show a fun
 * random bakery name with a 🎲 reroll (tappable, no typing) and a Play button (PRD §8.1).
 */
export class TitleScene extends Phaser.Scene {
  private nameText!: Phaser.GameObjects.Text;
  private names!: BakeryNames;

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .image(width / 2, height / 2, 'env_background')
      .setDisplaySize(width, height)
      .setAlpha(0.5);

    this.add
      .text(width / 2, height * 0.26, 'Sugarspark Bakery', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add.image(width / 2, height * 0.5, 'treat_cupcake').setScale(0.7);

    const existing = new SaveSystem().read();
    const continuing = existing !== null;

    const bakeryName = continuing ? existing.bakeryName : this.freshName();

    this.add
      .text(width / 2, height * 0.34, continuing ? 'Welcome back to' : 'Your new bakery:', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#7A4A26',
      })
      .setOrigin(0.5);

    this.nameText = this.add
      .text(width / 2, height * 0.39, bakeryName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#FF8FB1',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Reroll the random name — only for a brand-new game.
    if (!continuing) {
      new Button(this, width / 2 + 260, height * 0.39, {
        label: '🎲',
        width: 60,
        height: 60,
        bgColor: hex(PALETTE.butterYellow),
        onClick: () => {
          this.names = pickRandomNames();
          this.registry.set('newGameNames', this.names);
          this.nameText.setText(this.names.bakeryName);
        },
      });
    }

    new Button(this, width / 2, height * 0.78, {
      label: continuing ? 'Continue' : 'Play',
      icon: '▶',
      width: 280,
      height: 84,
      bgColor: hex(PALETTE.mint),
      onClick: () => this.scene.start('Game'),
    });
  }

  /** Pick a fresh random name and remember it for the Game scene to use. */
  private freshName(): string {
    this.names = pickRandomNames();
    this.registry.set('newGameNames', this.names);
    return this.names.bakeryName;
  }
}

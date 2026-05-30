import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { PALETTE } from '../assets/assetManifest';

/** Warm title screen with a single, obvious Play button (PRD §8.1). */
export class TitleScene extends Phaser.Scene {
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
      .text(width / 2, height * 0.3, 'Sugarspark Bakery', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3 + 64, 'Bake happy treats for happy friends!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#7A4A26',
      })
      .setOrigin(0.5);

    this.add.image(width / 2, height * 0.55, 'treat_cupcake').setScale(0.7);

    new Button(this, width / 2, height * 0.78, {
      label: 'Play',
      icon: '▶',
      width: 260,
      height: 84,
      bgColor: Phaser.Display.Color.HexStringToColor(PALETTE.mint).color,
      onClick: () => this.scene.start('Game'),
    });
  }
}

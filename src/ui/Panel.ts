import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

/** A soft rounded card used as the backdrop for overlay panels (Bake, Shop). */
export class Panel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, title?: string) {
    super(scene, x, y);

    const g = scene.add.graphics();
    g.fillStyle(hex(PALETTE.cream), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
    g.lineStyle(4, 0x000000, 0.1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
    this.add(g);

    if (title) {
      this.add(
        scene.add
          .text(0, -h / 2 + 36, title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '34px',
            color: '#7A4A26',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
    }

    scene.add.existing(this);
  }
}

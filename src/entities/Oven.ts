import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { prefersReducedMotion } from '../utils/motion';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

/** An oven sprite with a baking progress ring + a little bounce when a batch finishes. */
export class Oven extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Image;
  private readonly radius = 78;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.face = scene.add.image(0, 0, 'env_oven').setDisplaySize(140, 140);
    this.add(this.face);
    this.ring = scene.add.graphics();
    this.add(this.ring);
    scene.add.existing(this);
  }

  /** p is 0..1; the ring sweeps clockwise from the top. */
  setProgress(p: number): void {
    this.ring.clear();
    if (p <= 0) return;
    this.ring.lineStyle(10, hex(PALETTE.frostingPink), 1);
    this.ring.beginPath();
    this.ring.arc(0, 0, this.radius, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false);
    this.ring.strokePath();
  }

  /** Celebrate a finished batch. */
  bounce(): void {
    this.setProgress(0);
    if (prefersReducedMotion()) return;
    this.scene.tweens.add({
      targets: this.face,
      scale: { from: this.face.scale * 1.18, to: this.face.scale },
      duration: 320,
      ease: 'Back.easeOut',
    });
  }
}

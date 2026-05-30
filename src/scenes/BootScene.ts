import Phaser from 'phaser';

/** First scene. Nothing to load yet (placeholders are generated in Preload) — go straight on. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}

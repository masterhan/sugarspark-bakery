import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { prefersReducedMotion } from '../utils/motion';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

/**
 * A friendly "what to do next" coach: a speech bubble with a bouncing arrow pointing at the
 * thing to tap. Picture-first, one short instruction at a time (PRD §8.3). Used for first-time
 * onboarding and as gentle nudges. Lives above everything, ignores its own pointer events so it
 * never blocks the button it's pointing at.
 */
export class Coach extends Phaser.GameObjects.Container {
  private bubble: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private bounceTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(2000);

    this.bubble = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#7A4A26',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);
    this.arrow = scene.add.text(0, 0, '👇', { fontSize: '40px' }).setOrigin(0.5);

    this.add([this.bubble, this.label, this.arrow]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /**
   * Point at a target with a message. `arrowDir` chooses which way the arrow points
   * (the bubble sits on the opposite side so it doesn't cover the target).
   */
  show(
    message: string,
    targetX: number,
    targetY: number,
    arrowDir: 'up' | 'down' | 'left' | 'right' = 'down',
  ): void {
    this.label.setText(message);
    const padX = 22;
    const padY = 16;
    const bounds = this.label.getBounds();
    const w = bounds.width + padX * 2;
    const h = bounds.height + padY * 2;

    // Position the whole coach near the target, offset opposite the arrow direction.
    const gap = 70;
    const arrowGlyph = { up: '👆', down: '👇', left: '👈', right: '👉' }[arrowDir];
    this.arrow.setText(arrowGlyph);

    let cx = targetX;
    let cy = targetY;
    if (arrowDir === 'down') cy = targetY - gap - h / 2;
    if (arrowDir === 'up') cy = targetY + gap + h / 2;
    if (arrowDir === 'left') cx = targetX + gap + w / 2;
    if (arrowDir === 'right') cx = targetX - gap - w / 2;

    // Keep the bubble on-screen.
    const margin = 12;
    cx = Phaser.Math.Clamp(cx, w / 2 + margin, this.scene.scale.width - w / 2 - margin);
    cy = Phaser.Math.Clamp(cy, h / 2 + margin, this.scene.scale.height - h / 2 - margin);
    this.setPosition(cx, cy);

    // Draw the bubble.
    this.bubble.clear();
    this.bubble.fillStyle(hex(PALETTE.butterYellow), 1);
    this.bubble.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    this.bubble.lineStyle(3, 0x000000, 0.12);
    this.bubble.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

    // Arrow sits between the bubble and the target.
    this.arrow.setPosition(targetX - cx, targetY - cy);
    if (arrowDir === 'down') this.arrow.setPosition(0, h / 2 + 6);
    if (arrowDir === 'up') this.arrow.setPosition(0, -h / 2 - 6);
    if (arrowDir === 'left') this.arrow.setPosition(-w / 2 - 6, 0);
    if (arrowDir === 'right') this.arrow.setPosition(w / 2 + 6, 0);

    this.setVisible(true);
    this.setAlpha(1);

    this.bounceTween?.stop();
    if (!prefersReducedMotion()) {
      const baseY = this.arrow.y;
      this.bounceTween = this.scene.tweens.add({
        targets: this.arrow,
        y: baseY + (arrowDir === 'up' ? -10 : arrowDir === 'down' ? 10 : 0),
        x: this.arrow.x + (arrowDir === 'left' ? -10 : arrowDir === 'right' ? 10 : 0),
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  hide(): void {
    this.bounceTween?.stop();
    this.setVisible(false);
  }
}

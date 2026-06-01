import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { prefersReducedMotion } from '../utils/motion';

export interface ButtonOptions {
  label: string;
  /** Optional emoji/icon shown left of the label. */
  icon?: string;
  width?: number;
  height?: number;
  bgColor?: number;
  onClick: () => void;
}

const MIN_TARGET = 48; // PRD §8.4 minimum touch target.

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Big, rounded, high-contrast, tappable button with icon + label (PRD §8.3/§8.4).
 * Reusable everywhere — never clone this.
 *
 * IMPORTANT: the interactive object is the background RECTANGLE, not the Container.
 * Phaser hit-tests plain GameObjects reliably; interactive Containers are flaky (their
 * bounds collapse to child bounds), which silently broke every button. Routing input
 * through the rectangle is the robust, idiomatic fix.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly outline: Phaser.GameObjects.Graphics;
  private readonly boxW: number;
  private readonly boxH: number;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);

    this.boxW = Math.max(MIN_TARGET, opts.width ?? 220);
    this.boxH = Math.max(MIN_TARGET, opts.height ?? 72);
    const fill = opts.bgColor ?? hexToNumber(PALETTE.frostingPink);

    // Solid rounded body: a rectangle (the interactive hit target) + a graphics outline.
    this.hit = scene.add
      .rectangle(0, 0, this.boxW, this.boxH, fill, 1)
      .setStrokeStyle(3, 0x000000, 0.12);
    this.hit.setInteractive({ useHandCursor: true });
    this.add(this.hit);

    // Rounded corners drawn over the rectangle so it reads as a soft button.
    this.outline = scene.add.graphics();
    this.outline.fillStyle(fill, 1);
    this.outline.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 18);
    this.outline.lineStyle(3, 0x000000, 0.12);
    this.outline.strokeRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 18);
    this.add(this.outline);
    this.hit.setFillStyle(fill, 0.001); // keep rect transparent; the rounded graphic shows

    const labelText = opts.icon ? `${opts.icon}  ${opts.label}` : opts.label;
    this.add(
      scene.add
        .text(0, 0, labelText, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    this.hit.on('pointerover', () => this.enabled && !prefersReducedMotion() && this.setScale(1.04));
    this.hit.on('pointerout', () => this.setScale(1));
    this.hit.on('pointerdown', () => {
      if (this.enabled && !prefersReducedMotion()) this.setScale(0.96);
    });
    this.hit.on('pointerup', () => {
      if (!this.enabled) return;
      this.setScale(1);
      opts.onClick();
    });

    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    if (this.enabled) this.hit.setInteractive({ useHandCursor: true });
    else this.hit.disableInteractive();
    return this;
  }
}

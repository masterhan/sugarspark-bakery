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
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private readonly boxW: number;
  private readonly boxH: number;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);

    this.boxW = Math.max(MIN_TARGET, opts.width ?? 220);
    this.boxH = Math.max(MIN_TARGET, opts.height ?? 72);
    const fill = opts.bgColor ?? hexToNumber(PALETTE.frostingPink);

    this.bg = scene.add.graphics();
    this.drawBg(fill);
    this.add(this.bg);

    const labelText = opts.icon ? `${opts.icon}  ${opts.label}` : opts.label;
    const text = scene.add
      .text(0, 0, labelText, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add(text);

    this.setSize(this.boxW, this.boxH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerover', () => this.enabled && this.setScale(1.04));
    this.on('pointerout', () => this.setScale(1));
    this.on('pointerdown', () => this.enabled && this.press());
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.setScale(1);
      opts.onClick();
    });

    scene.add.existing(this);
  }

  private drawBg(fill: number): void {
    this.bg.clear();
    this.bg.fillStyle(fill, 1);
    this.bg.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 18);
    this.bg.lineStyle(3, 0x000000, 0.12);
    this.bg.strokeRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, this.boxH, 18);
  }

  private press(): void {
    if (prefersReducedMotion()) return;
    this.setScale(0.96);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }
}

import Phaser from 'phaser';
import type { AssetSpec } from './assetManifest';

/**
 * Draws colored rounded-rect + emoji placeholders into the Phaser texture cache at runtime,
 * one per logical asset key. This is what makes the game playable before any real art exists.
 */

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Generate (or replace) one placeholder texture under spec.key. */
export function generatePlaceholder(scene: Phaser.Scene, spec: AssetSpec): void {
  const { key, size, bgColor, emoji } = spec;
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();

  const pad = Math.round(size * 0.06);
  const radius = Math.round(size * 0.18);

  // Soft body.
  ctx.fillStyle = bgColor;
  roundedRect(ctx, pad, pad, size - pad * 2, size - pad * 2, radius);
  ctx.fill();

  // Gentle outline (PRD style: rounded shapes, gentle outline).
  ctx.lineWidth = Math.max(2, Math.round(size * 0.02));
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  roundedRect(ctx, pad, pad, size - pad * 2, size - pad * 2, radius);
  ctx.stroke();

  // Emoji glyph, centered.
  if (emoji) {
    ctx.font = `${Math.round(size * 0.5)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  }

  tex.refresh();
}

/** Generate placeholders for every provided spec. */
export function generateAllPlaceholders(scene: Phaser.Scene, specs: readonly AssetSpec[]): void {
  for (const spec of specs) generatePlaceholder(scene, spec);
}

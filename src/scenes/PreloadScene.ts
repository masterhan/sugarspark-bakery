import Phaser from 'phaser';
import {
  loadAssetManifest,
  PALETTE,
  PLACEHOLDER_SPECS,
  type AssetManifest,
} from '../assets/assetManifest';
import { generateAllPlaceholders, generatePlaceholder } from '../assets/PlaceholderFactory';

/**
 * Builds the art the game needs:
 *  1) Always generate placeholders for every logical key (guarantees zero missing-art).
 *  2) If manifest.json says useRealArt, load the atlas and overwrite the keys that have
 *     real frames — so a partial atlas still renders everything, with no code changes.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.drawLoadingBar();
    void this.boot();
  }

  private drawLoadingBar(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 60, 'Sugarspark Bakery', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const barW = Math.min(420, width * 0.6);
    const barH = 24;
    const x = width / 2 - barW / 2;
    const y = height / 2 + 20;

    this.add.rectangle(width / 2, y + barH / 2, barW + 8, barH + 8, 0xffffff).setOrigin(0.5);
    const fill = this.add
      .rectangle(x, y, 1, barH, Phaser.Display.Color.HexStringToColor(PALETTE.frostingPink).color)
      .setOrigin(0, 0);

    this.tweens.add({ targets: fill, width: barW, duration: 500, ease: 'Sine.easeOut' });
  }

  private async boot(): Promise<void> {
    // Step 1 — placeholders always, so nothing is ever a missing texture.
    generateAllPlaceholders(this, PLACEHOLDER_SPECS);

    // Step 2 — real art if present.
    const base = import.meta.env.BASE_URL;
    const manifest = await loadAssetManifest(base);
    if (manifest.useRealArt && Object.keys(manifest.frames).length > 0) {
      await this.loadRealAtlas(base, manifest);
    }

    // Small minimum dwell so the loading bar reads as intentional, not a flash.
    this.time.delayedCall(550, () => this.scene.start('Title'));
  }

  private async loadRealAtlas(base: string, manifest: AssetManifest): Promise<void> {
    this.load.atlas(
      'bakery_atlas',
      `${base}assets/${manifest.atlas.texture}`,
      `${base}assets/${manifest.atlas.data}`,
    );
    await new Promise<void>((resolve) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      this.load.start();
    });

    if (!this.textures.exists('bakery_atlas')) return;
    const atlas = this.textures.get('bakery_atlas');

    // Copy each real frame into its own texture keyed by the logical key, so existing
    // code (which references logical keys directly) needs zero changes.
    for (const [logicalKey, frameName] of Object.entries(manifest.frames)) {
      if (!atlas.has(frameName)) continue;
      const spec = PLACEHOLDER_SPECS.find((s) => s.key === logicalKey);
      if (!spec) continue;
      const frame = atlas.get(frameName);
      const image = frame.source.image as unknown as CanvasImageSource | undefined;
      if (!image) continue;
      if (this.textures.exists(logicalKey)) this.textures.remove(logicalKey);
      const canvasTex = this.textures.createCanvas(logicalKey, frame.width, frame.height);
      if (!canvasTex) {
        // Restore the placeholder we just removed.
        generatePlaceholder(this, spec);
        continue;
      }
      canvasTex
        .getContext()
        .drawImage(
          image,
          frame.cutX,
          frame.cutY,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height,
        );
      canvasTex.refresh();
    }
  }
}

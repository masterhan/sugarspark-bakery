import { CUSTOMER_TYPES, INGREDIENTS, RECIPES } from '../config/balance';

/**
 * Asset system — decoupled from real art (PRD §6).
 *
 * Every visual the game references is a LOGICAL KEY (e.g. "treat_cookie"). Until real
 * AI-generated art exists, PreloadScene draws a colored placeholder for each key at runtime,
 * so the game is fully playable with zero missing-art errors.
 *
 * Swapping in real art requires NO code edits: drop a packed atlas into public/assets/atlas/
 * and flip "useRealArt": true (with frame mappings) in public/assets/manifest.json.
 */

// Anchor palette (PRD §6.1) — keep all placeholder art in this warm family.
export const PALETTE = {
  cream: '#FFF6E9',
  frostingPink: '#FF8FB1',
  butterYellow: '#FFD66B',
  mint: '#8FE0C2',
  chocolateBrown: '#7A4A26',
} as const;

export interface AssetSpec {
  /** Logical key the code references and the atlas frame must match. */
  key: string;
  /** Emoji drawn on the placeholder. Empty string = plain colored panel. */
  emoji: string;
  /** Placeholder background color. */
  bgColor: string;
  /** Square texture size in px. */
  size: number;
}

/** Shape of public/assets/manifest.json. */
export interface AssetManifest {
  useRealArt: boolean;
  atlas: { texture: string; data: string };
  /** logical key -> atlas frame name (only used when useRealArt is true). */
  frames: Record<string, string>;
}

const SPRITE = 256;
const UI = 128;

// Static UI / environment / character keys not derived from gameplay data.
const STATIC_SPECS: readonly AssetSpec[] = [
  { key: 'env_background', emoji: '', bgColor: PALETTE.cream, size: SPRITE },
  { key: 'env_counter', emoji: '', bgColor: PALETTE.chocolateBrown, size: SPRITE },
  { key: 'env_display', emoji: '🪟', bgColor: PALETTE.cream, size: SPRITE },
  { key: 'env_oven', emoji: '🔥', bgColor: PALETTE.chocolateBrown, size: SPRITE },
  { key: 'env_register', emoji: '💰', bgColor: PALETTE.butterYellow, size: SPRITE },
  { key: 'env_shelf', emoji: '', bgColor: PALETTE.chocolateBrown, size: SPRITE },
  { key: 'env_door', emoji: '🚪', bgColor: PALETTE.mint, size: SPRITE },
  { key: 'env_window', emoji: '🪟', bgColor: PALETTE.mint, size: SPRITE },
  { key: 'baker_avatar', emoji: '🧑‍🍳', bgColor: PALETTE.frostingPink, size: SPRITE },
  { key: 'ui_coin', emoji: '🪙', bgColor: PALETTE.butterYellow, size: UI },
  { key: 'ui_button', emoji: '', bgColor: PALETTE.frostingPink, size: UI },
  { key: 'ui_panel', emoji: '', bgColor: PALETTE.cream, size: UI },
  { key: 'ui_speech', emoji: '💬', bgColor: PALETTE.cream, size: UI },
  { key: 'ui_day_banner', emoji: '🎉', bgColor: PALETTE.butterYellow, size: UI },
  { key: 'ui_speedy', emoji: '⚡', bgColor: PALETTE.butterYellow, size: UI },
  { key: 'ui_sign', emoji: '🪧', bgColor: PALETTE.frostingPink, size: UI },
  { key: 'ui_decorations', emoji: '🎀', bgColor: PALETTE.frostingPink, size: UI },
];

function buildSpecs(): AssetSpec[] {
  const byKey = new Map<string, AssetSpec>();
  const add = (spec: AssetSpec) => {
    if (!byKey.has(spec.key)) byKey.set(spec.key, spec);
  };

  for (const ing of INGREDIENTS) {
    add({ key: ing.assetKey, emoji: ing.emoji, bgColor: PALETTE.mint, size: UI });
  }
  for (const r of RECIPES) {
    add({ key: r.assetKey, emoji: r.emoji, bgColor: PALETTE.frostingPink, size: SPRITE });
  }
  for (const c of CUSTOMER_TYPES) {
    add({ key: c.assetKey, emoji: c.emoji, bgColor: PALETTE.butterYellow, size: SPRITE });
    add({ key: c.happyAssetKey, emoji: c.emoji, bgColor: PALETTE.mint, size: SPRITE });
  }
  for (const s of STATIC_SPECS) add(s);

  return [...byKey.values()];
}

/** Every logical asset key + its placeholder look. The one registry of keys. */
export const PLACEHOLDER_SPECS: readonly AssetSpec[] = buildSpecs();

/** Fallback used if manifest.json can't be fetched (e.g. file:// or offline dev). */
export const DEFAULT_MANIFEST: AssetManifest = {
  useRealArt: false,
  atlas: { texture: 'atlas/bakery.png', data: 'atlas/bakery.json' },
  frames: {},
};

/**
 * Load public/assets/manifest.json at runtime. Falls back to placeholder mode on any error,
 * so the game NEVER fails to start over a missing/broken manifest.
 */
export async function loadAssetManifest(baseUrl: string): Promise<AssetManifest> {
  try {
    const res = await fetch(`${baseUrl}assets/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return DEFAULT_MANIFEST;
    const json = (await res.json()) as Partial<AssetManifest>;
    return { ...DEFAULT_MANIFEST, ...json };
  } catch {
    return DEFAULT_MANIFEST;
  }
}

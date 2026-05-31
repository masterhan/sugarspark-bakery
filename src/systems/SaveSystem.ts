import { treatIds } from '../data/recipes';
import { upgrades } from '../data/upgrades';
import type { TreatId, UpgradeId } from '../data/types';
import {
  GameState,
  SCHEMA_VERSION,
  type FinishedGoodCounts,
  type IngredientCounts,
  type SaveData,
} from '../state/GameState';
import { sanitizeName } from '../utils/sanitize';

/** Minimal storage shape — real localStorage in the browser, an in-memory mock in tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = 'sugarspark-save';
const DEBOUNCE_MS = 500;

const ALLOWED_TREATS: ReadonlySet<string> = new Set(treatIds);
const ALLOWED_UPGRADES: ReadonlySet<string> = new Set(upgrades.map((u) => u.id));

/**
 * Persists the whole game to the browser, with a versioned format that can be safely upgraded
 * (migrate). Auto-save is debounced so rapid changes coalesce into one write; export/import give
 * the player a real, device-independent backup file. Never throws — a broken save can't crash
 * the game.
 */
export class SaveSystem {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: GameState | null = null;

  constructor(
    private readonly storage: StorageLike | null = typeof localStorage !== 'undefined'
      ? localStorage
      : null,
    private readonly key: string = SAVE_KEY,
  ) {}

  hasSave(): boolean {
    return !!this.storage && this.storage.getItem(this.key) !== null;
  }

  /** Write immediately and synchronously. */
  write(state: GameState): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(state.toSave()));
    } catch {
      // storage full or disabled (e.g. private mode) — never crash the game over a save.
    }
  }

  /** Debounced write: coalesces a burst of changes into a single save ~500ms later. */
  scheduleWrite(state: GameState): void {
    this.pending = state;
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  /** Force any pending debounced write to happen now (e.g. tab hidden/closed). */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending) {
      this.write(this.pending);
      this.pending = null;
    }
  }

  /** Read + migrate the stored save into a clean data object, or null if none/invalid. */
  read(): SaveData | null {
    if (!this.storage) return null;
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Rebuild a live GameState from storage, or null if there's nothing valid. */
  load(): GameState | null {
    const data = this.read();
    return data ? GameState.fromSave(data) : null;
  }

  clear(): void {
    this.storage?.removeItem(this.key);
  }

  exportJson(state: GameState): string {
    return JSON.stringify(state.toSave(), null, 2);
  }

  /** Parse + migrate an imported backup. Returns null for anything invalid (never throws). */
  importJson(json: string): GameState | null {
    try {
      const data = migrate(JSON.parse(json));
      return data ? GameState.fromSave(data) : null;
    } catch {
      return null;
    }
  }
}

// ── Migration / validation ───────────────────────────────────────────────────

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function coerceCounts<K extends string>(
  v: unknown,
  fallback: Record<K, number>,
): Record<K, number> {
  const out = { ...fallback };
  if (v && typeof v === 'object') {
    const rec = v as Record<string, unknown>;
    for (const key of Object.keys(fallback) as K[]) {
      const val = rec[key];
      if (typeof val === 'number' && Number.isFinite(val)) out[key] = Math.max(0, Math.floor(val));
    }
  }
  return out;
}

function coerceList<T extends string>(
  v: unknown,
  fallback: T[],
  allowed: ReadonlySet<string>,
): T[] {
  if (!Array.isArray(v)) return [...fallback];
  const filtered = v.filter((x): x is T => typeof x === 'string' && allowed.has(x));
  return filtered.length ? Array.from(new Set(filtered)) : [...fallback];
}

/**
 * Turn an unknown blob (a stored save, an imported file, an older version) into a complete,
 * sane SaveData — or null if it isn't a save at all. Forward-compatible: missing fields get
 * sensible defaults; impossible values are clamped. This is where future format upgrades live.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!('coins' in r) && !('ingredients' in r) && !('schemaVersion' in r)) return null;

  const d = GameState.createNew().toSave();
  const settings = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as {
    muted?: unknown;
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    bakeryName: sanitizeName(str(r.bakeryName, d.bakeryName), d.bakeryName),
    bakerName: sanitizeName(str(r.bakerName, d.bakerName), d.bakerName),
    coins: Math.max(0, Math.floor(num(r.coins, d.coins))),
    coinsEarnedTotal: Math.max(0, Math.floor(num(r.coinsEarnedTotal, d.coinsEarnedTotal))),
    day: Math.max(1, Math.floor(num(r.day, d.day))),
    salesTotal: Math.max(0, Math.floor(num(r.salesTotal, d.salesTotal))),
    ovens: Math.max(1, Math.floor(num(r.ovens, d.ovens))),
    displayCapacity: Math.max(1, Math.floor(num(r.displayCapacity, d.displayCapacity))),
    ingredients: coerceCounts<keyof IngredientCounts & string>(r.ingredients, d.ingredients),
    finishedGoods: coerceCounts<keyof FinishedGoodCounts & string>(
      r.finishedGoods,
      d.finishedGoods,
    ),
    unlockedRecipes: coerceList<TreatId>(r.unlockedRecipes, d.unlockedRecipes, ALLOWED_TREATS),
    upgradesOwned: coerceList<UpgradeId>(r.upgradesOwned, d.upgradesOwned, ALLOWED_UPGRADES),
    lastSafetyNetDay: Math.max(0, Math.floor(num(r.lastSafetyNetDay, d.lastSafetyNetDay))),
    settings: { muted: typeof settings.muted === 'boolean' ? settings.muted : d.settings.muted },
  };
}

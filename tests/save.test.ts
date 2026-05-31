import { beforeEach, describe, expect, it } from 'vitest';
import { migrate, SaveSystem, type StorageLike } from '../src/systems/SaveSystem';
import { GameState, SCHEMA_VERSION } from '../src/state/GameState';

class MemStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

let storage: MemStorage;
let save: SaveSystem;

beforeEach(() => {
  storage = new MemStorage();
  save = new SaveSystem(storage);
});

describe('SaveSystem', () => {
  it('writes and reads a save round-trip', () => {
    const s = GameState.createNew();
    s.coins = 123;
    s.day = 4;
    s.finishedGoods.cookie = 2;
    save.write(s);

    const loaded = save.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.coins).toBe(123);
    expect(loaded!.day).toBe(4);
    expect(loaded!.getFinished('cookie')).toBe(2);
  });

  it('reports hasSave and can clear', () => {
    expect(save.hasSave()).toBe(false);
    save.write(GameState.createNew());
    expect(save.hasSave()).toBe(true);
    save.clear();
    expect(save.hasSave()).toBe(false);
    expect(save.load()).toBeNull();
  });

  it('debounced scheduleWrite persists only after flush', () => {
    const s = GameState.createNew();
    s.coins = 999;
    save.scheduleWrite(s);
    expect(save.hasSave()).toBe(false); // nothing written yet
    save.flush();
    expect(save.load()!.coins).toBe(999);
  });

  it('persists the mute setting', () => {
    const s = GameState.createNew();
    s.settings.muted = true;
    save.write(s);
    expect(save.load()!.settings.muted).toBe(true);
  });

  it('returns null when nothing is stored', () => {
    expect(save.read()).toBeNull();
    expect(save.load()).toBeNull();
  });

  it('never throws when there is no storage at all', () => {
    const noStore = new SaveSystem(null);
    expect(() => noStore.write(GameState.createNew())).not.toThrow();
    expect(noStore.load()).toBeNull();
    expect(noStore.hasSave()).toBe(false);
  });
});

describe('save migration', () => {
  it('fills in defaults for a partial/old save', () => {
    const data = migrate({ coins: 120, schemaVersion: 1 });
    expect(data).not.toBeNull();
    expect(data!.coins).toBe(120);
    expect(data!.day).toBe(1);
    expect(data!.ingredients.flour).toBe(6); // starting default
    expect(data!.unlockedRecipes).toEqual(['cookie', 'cupcake']);
    expect(data!.settings.muted).toBe(false);
  });

  it('upgrades schemaVersion to current', () => {
    const data = migrate({ coins: 10, schemaVersion: 0 });
    expect(data!.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('clamps impossible values to safe ranges', () => {
    const data = migrate({ coins: -50, day: -3, ovens: 0, displayCapacity: -1 });
    expect(data!.coins).toBe(0);
    expect(data!.day).toBe(1);
    expect(data!.ovens).toBe(1);
    expect(data!.displayCapacity).toBe(1);
  });

  it('drops unknown recipe/upgrade ids', () => {
    const data = migrate({
      coins: 10,
      unlockedRecipes: ['cookie', 'hacker_treat', 'pie'],
      upgradesOwned: ['speedyOven', 'bogus'],
    });
    expect(data!.unlockedRecipes).toEqual(['cookie', 'pie']);
    expect(data!.upgradesOwned).toEqual(['speedyOven']);
  });

  it('sanitizes names (strips angle brackets, caps length)', () => {
    const data = migrate({
      coins: 10,
      bakeryName: '<script>Evil</script>BakeryNameThatIsWayTooLong',
    });
    expect(data!.bakeryName).not.toContain('<');
    expect(data!.bakeryName.length).toBeLessThanOrEqual(24);
  });

  it('keeps the spaces in a normal multi-word bakery name', () => {
    const data = migrate({ coins: 10, bakeryName: 'Honeybee Bakery' });
    expect(data!.bakeryName).toBe('Honeybee Bakery');
  });

  it('rejects non-save objects and garbage', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(42)).toBeNull();
    expect(migrate('hello')).toBeNull();
    expect(migrate({ foo: 'bar' })).toBeNull();
  });

  it('importJson returns null for invalid JSON', () => {
    expect(save.importJson('not json at all')).toBeNull();
    expect(save.importJson('"just a string"')).toBeNull();
  });
});

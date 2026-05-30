import { UPGRADES } from '../config/balance';
import type { Upgrade, UpgradeId } from './types';

/** All upgrades, in display order. Numbers come from balance.ts. */
export const upgrades: readonly Upgrade[] = UPGRADES;

/** Fast lookup by id. */
export const upgradeById: ReadonlyMap<UpgradeId, Upgrade> = new Map(UPGRADES.map((u) => [u.id, u]));

export function getUpgrade(id: UpgradeId): Upgrade {
  const def = upgradeById.get(id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}

/** Fun, cozy default names so a new bakery feels personal without any typing. */

export interface BakeryNames {
  bakeryName: string;
  bakerName: string;
}

const BAKERY_WORDS = [
  'Sugarspark',
  'Honeybee',
  'Sunny',
  'Cosy',
  'Maple',
  'Berry',
  'Cloud',
  'Sprinkle',
  'Buttercup',
  'Cinnamon',
  'Marshmallow',
  'Peppermint',
] as const;

const BAKERY_KINDS = ['Bakery', 'Cakes', 'Treats', 'Kitchen', 'Bites', 'Sweets'] as const;

const BAKER_NAMES = [
  'Sprinkle',
  'Pip',
  'Coco',
  'Waffle',
  'Biscuit',
  'Maple',
  'Pudding',
  'Muffin',
  'Nutmeg',
  'Sunny',
  'Cookie',
  'Pumpkin',
] as const;

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function pickRandomNames(rng: () => number = Math.random): BakeryNames {
  return {
    bakeryName: `${pick(BAKERY_WORDS, rng)} ${pick(BAKERY_KINDS, rng)}`,
    bakerName: pick(BAKER_NAMES, rng),
  };
}

import { beforeEach, describe, expect, it } from 'vitest';
import { TypedEmitter } from '../src/events/EventBus';
import { GameController } from '../src/state/GameController';

let game: GameController;
let bus: TypedEmitter;

beforeEach(() => {
  bus = new TypedEmitter();
  game = new GameController(bus, () => 0.5);
});

describe('ProgressionSystem', () => {
  it('unlocks a recipe once its lifetime-earned threshold is reached', () => {
    let unlocked: string | null = null;
    bus.on('RECIPE_UNLOCKED', (p) => (unlocked = p.recipeId));
    expect(game.state.isRecipeUnlocked('pie')).toBe(false);

    game.state.coinsEarnedTotal = 150; // pie unlocks at 150
    game.progression.tick();

    expect(game.state.isRecipeUnlocked('pie')).toBe(true);
    expect(unlocked).toBe('pie');
    expect(game.state.isRecipeUnlocked('cake')).toBe(false); // still gated at 400
  });

  it('advances a soft day every 10 sales', () => {
    let day = 0;
    bus.on('DAY_ADVANCED', (p) => (day = p.day));
    game.state.salesTotal = 10;
    game.progression.tick();
    expect(game.state.day).toBe(2);
    expect(day).toBe(2);
  });

  it('grants a starter pack at most once per day when broke and out of ingredients', () => {
    game.state.coins = 0;
    for (const id of Object.keys(game.state.ingredients)) {
      game.state.ingredients[id as keyof typeof game.state.ingredients] = 0;
    }
    let grants = 0;
    bus.on('SAFETY_NET_GRANTED', () => (grants += 1));

    game.progression.tick();
    expect(game.state.getIngredient('flour')).toBe(4);
    expect(grants).toBe(1);

    game.progression.tick(); // same day → no second gift
    expect(grants).toBe(1);
  });
});

describe('ShopSystem (upgrades take effect)', () => {
  it('buys a second oven: oven count and oven slots both grow', () => {
    game.economy.earn(500);
    expect(game.baking.ovens).toHaveLength(1);
    expect(game.buyUpgrade('secondOven')).toBe(true);
    expect(game.state.ovens).toBe(2);
    expect(game.baking.ovens).toHaveLength(2);
    expect(game.buyUpgrade('secondOven')).toBe(false); // can't buy twice
  });

  it('speedy oven makes baking 30% faster', () => {
    expect(game.baking.bakeDurationMs('cookie')).toBe(20000);
    game.economy.earn(500);
    expect(game.buyUpgrade('speedyOven')).toBe(true);
    expect(game.baking.bakeDurationMs('cookie')).toBe(14000); // 20000 * 0.7
  });

  it('bigger display raises the display capacity to 12', () => {
    expect(game.state.displayCapacity).toBe(6);
    game.economy.earn(500);
    expect(game.buyUpgrade('biggerDisplay')).toBe(true);
    expect(game.state.displayCapacity).toBe(12);
  });

  it('refuses an upgrade you cannot afford (nothing changes)', () => {
    game.state.coins = 10; // cheery sign costs 180
    expect(game.buyUpgrade('cheerySign')).toBe(false);
    expect(game.state.hasUpgrade('cheerySign')).toBe(false);
    expect(game.state.coins).toBe(10);
  });

  it('buys ingredients with coins', () => {
    const before = game.state.getIngredient('fruit');
    expect(game.buyIngredient('fruit', 3)).toBe(true); // 3 * 3 coins = 9
    expect(game.state.getIngredient('fruit')).toBe(before + 3);
    expect(game.state.coins).toBe(50 - 9);
  });
});

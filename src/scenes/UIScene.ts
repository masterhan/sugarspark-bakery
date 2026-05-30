import Phaser from 'phaser';
import { EventBus } from '../events/EventBus';
import type { GameState } from '../state/GameState';

/**
 * Overlay UI: the always-visible top bar (coins + day). Reads the shared GameState and
 * reacts to events — it never mutates state directly (PRD §9.2).
 */
export class UIScene extends Phaser.Scene {
  private state!: GameState;
  private coinsText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private unsubscribe: Array<() => void> = [];

  constructor() {
    super('UI');
  }

  create(): void {
    this.state = this.registry.get('state') as GameState;
    const { width } = this.scale;

    // Top bar band.
    this.add.rectangle(width / 2, 36, width, 72, 0xffffff, 0.85).setOrigin(0.5);

    // Coins (icon + number) — top left.
    this.add.image(54, 36, 'ui_coin').setDisplaySize(44, 44);
    this.coinsText = this.add
      .text(84, 36, `${this.state.coins}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Day — top right.
    this.dayText = this.add
      .text(width - 24, 36, `Day ${this.state.day}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    this.unsubscribe.push(
      EventBus.on('COINS_CHANGED', ({ coins }) => this.coinsText.setText(`${coins}`)),
      EventBus.on('DAY_ADVANCED', ({ day }) => this.dayText.setText(`Day ${day}`)),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe.forEach((off) => off());
      this.unsubscribe = [];
    });
  }
}

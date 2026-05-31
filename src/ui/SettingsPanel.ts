import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import type { GameState } from '../state/GameState';
import type { SaveSystem } from '../systems/SaveSystem';
import { downloadText, pickTextFile } from '../utils/file';
import { sanitizeName } from '../utils/sanitize';
import { Button } from './Button';
import { Panel } from './Panel';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

export interface SettingsActions {
  /** Called after a backup file is successfully loaded — caller should restart into it. */
  onApplyImport: () => void;
  /** Called after the save is cleared — caller should return to a fresh start. */
  onStartOver: () => void;
  onClose: () => void;
}

/** Overlay: sound toggle, save-to-file / load-from-file backup, and start over (PRD §8.1/§10). */
export class SettingsPanel extends Phaser.GameObjects.Container {
  private soundLabel: Phaser.GameObjects.Text;
  private note: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly gameState: GameState,
    private readonly saveSystem: SaveSystem,
    private readonly actions: SettingsActions,
  ) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.setDepth(1000);

    const { width, height } = scene.scale;
    this.add(scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.45).setInteractive());
    this.add(new Panel(scene, 0, 0, 620, 540, 'Settings ⚙️'));

    this.soundLabel = scene.add
      .text(0, -158, this.soundText(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#7A4A26',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add(this.soundLabel);

    this.add(
      new Button(scene, 0, -108, {
        label: 'Toggle Sound',
        width: 320,
        height: 60,
        bgColor: hex(PALETTE.mint),
        onClick: () => this.toggleSound(),
      }),
    );
    this.add(
      new Button(scene, 0, -26, {
        label: 'Save to File',
        icon: '💾',
        width: 320,
        height: 60,
        bgColor: hex(PALETTE.butterYellow),
        onClick: () => this.exportSave(),
      }),
    );
    this.add(
      new Button(scene, 0, 56, {
        label: 'Load from File',
        icon: '📂',
        width: 320,
        height: 60,
        bgColor: hex(PALETTE.butterYellow),
        onClick: () => void this.importSave(),
      }),
    );
    this.add(
      new Button(scene, 0, 150, {
        label: 'Start Over',
        icon: '🔄',
        width: 320,
        height: 60,
        bgColor: hex(PALETTE.frostingPink),
        onClick: () => {
          this.saveSystem.clear();
          this.actions.onStartOver();
        },
      }),
    );

    this.note = scene.add
      .text(0, 212, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#7A4A26',
      })
      .setOrigin(0.5);
    this.add(this.note);

    this.add(
      new Button(scene, 280, -230, {
        label: '✕',
        width: 60,
        height: 60,
        bgColor: hex(PALETTE.chocolateBrown),
        onClick: () => this.actions.onClose(),
      }),
    );

    scene.add.existing(this);
  }

  private soundText(): string {
    return this.gameState.settings.muted ? 'Sound: Off 🔇' : 'Sound: On 🔊';
  }

  private toggleSound(): void {
    this.gameState.settings.muted = !this.gameState.settings.muted;
    this.saveSystem.write(this.gameState);
    this.soundLabel.setText(this.soundText());
    this.scene.sound.mute = this.gameState.settings.muted;
  }

  private exportSave(): void {
    this.saveSystem.write(this.gameState);
    downloadText(
      `${sanitizeName(this.gameState.bakeryName)}.json`,
      this.saveSystem.exportJson(this.gameState),
    );
    this.note.setText('Saved a backup file! 💾');
  }

  private async importSave(): Promise<void> {
    const text = await pickTextFile();
    if (!text) return;
    const imported = this.saveSystem.importJson(text);
    if (!imported) {
      this.note.setText("Hmm, couldn't read that file.");
      return;
    }
    this.saveSystem.write(imported);
    this.actions.onApplyImport();
  }

  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}

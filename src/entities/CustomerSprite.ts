import Phaser from 'phaser';
import { PALETTE } from '../assets/assetManifest';
import { customerTypeById } from '../data/customers';
import { getRecipe } from '../data/recipes';
import type { CustomerTypeId, TreatId } from '../data/types';
import { prefersReducedMotion } from '../utils/motion';

function hex(c: string): number {
  return Phaser.Display.Color.HexStringToColor(c).color;
}

/**
 * The visual for one waiting customer: their face, a speech bubble showing the treat they
 * want, and a patience ring. Tapping them tries to serve. Leaving is always happy.
 */
export class CustomerSprite extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly radius = 30;
  private readonly typeId: CustomerTypeId;

  constructor(
    scene: Phaser.Scene,
    public readonly orderId: string,
    typeId: CustomerTypeId,
    wantedTreat: TreatId,
    onTap: (orderId: string) => void,
  ) {
    super(scene, 0, 0);
    this.typeId = typeId;
    const type = customerTypeById.get(typeId)!;

    this.face = scene.add.image(0, 0, type.assetKey).setDisplaySize(130, 130);
    this.add(this.face);

    // Speech bubble with the wanted treat.
    this.add(scene.add.image(78, -78, 'ui_speech').setDisplaySize(104, 104));
    this.add(scene.add.image(78, -82, getRecipe(wantedTreat).assetKey).setDisplaySize(60, 60));

    this.ring = scene.add.graphics();
    this.add(this.ring);

    this.face.setInteractive({ useHandCursor: true });
    this.face.on(Phaser.Input.Events.POINTER_DOWN, () => onTap(this.orderId));

    scene.add.existing(this);
  }

  /** frac is patience remaining, 0..1. */
  setPatience(frac: number): void {
    const f = Phaser.Math.Clamp(frac, 0, 1);
    this.ring.clear();
    this.ring.lineStyle(8, hex(PALETTE.mint), 1);
    this.ring.beginPath();
    this.ring.arc(0, 84, this.radius, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false);
    this.ring.strokePath();
  }

  /** Slide in from below to the given counter position. */
  walkIn(targetX: number, targetY: number): void {
    if (prefersReducedMotion()) {
      this.setPosition(targetX, targetY);
      return;
    }
    this.setPosition(targetX, targetY + 220);
    this.scene.tweens.add({ targets: this, y: targetY, duration: 500, ease: 'Sine.easeOut' });
  }

  /** Show a happy/farewell reaction, then slide away and clean up. */
  celebrateAndLeave(served: boolean, onDone: () => void): void {
    const type = customerTypeById.get(this.typeId)!;
    if (served) this.face.setTexture(type.happyAssetKey);
    this.ring.clear();
    this.add(
      this.scene.add
        .text(0, -120, served ? 'Yum! 😋' : 'Bye! 👋', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color: '#7A4A26',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    if (prefersReducedMotion()) {
      onDone();
      this.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      y: this.y + 240,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeIn',
      onComplete: () => {
        onDone();
        this.destroy();
      },
    });
  }
}

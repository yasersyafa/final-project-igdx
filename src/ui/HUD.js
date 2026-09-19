import { Sidebar } from './Sidebar.js';
import { ControlBar } from './ControlBar.js';
import { DialogBox } from './DialogBox.js';
import { EVENTS } from '../config/events.js';

export const HUD_DEPTH = 1000;
export const SIDEBAR_DEPTH = 1050;
export const DIALOG_DEPTH = 1500;

export class HUD {
  constructor(scene, bus, levelData) {
    this.controls = new ControlBar(scene, bus, levelData, HUD_DEPTH);
    this.sidebar = new Sidebar(scene, bus, levelData, SIDEBAR_DEPTH);
    this.dialog = new DialogBox(scene, bus, levelData, DIALOG_DEPTH);

    const { width: W } = scene.cameras.main;
    this.pauseButton = scene.add.image(W - 52, 42, 'ui_pause_button')
      .setDisplaySize(72, 64)
      .setDepth(SIDEBAR_DEPTH + 1)
      .setInteractive({ useHandCursor: true });

    this.pauseButton.on('pointerover', () => this.pauseButton.setAlpha(0.86));
    this.pauseButton.on('pointerout', () => this.pauseButton.setAlpha(1));
    this.pauseButton.on('pointerdown', () => {
      bus.emit(EVENTS.UI_BUTTON_CLICK);

      this.pauseButton.disableInteractive();
      this.pauseButton.setVisible(false);
      const snapshotKey = `pause-snapshot-${scene.scene.key}`;
      scene.game.renderer.snapshot((image) => {
        if (scene.textures.exists(snapshotKey)) scene.textures.remove(snapshotKey);
        scene.textures.addImage(snapshotKey, image);
        scene.scene.launch('PauseScene', { returnScene: scene.scene.key, snapshotKey });
        scene.scene.pause(scene.scene.key);
        this.pauseButton.setVisible(true);
        this.pauseButton.setInteractive({ useHandCursor: true });
      }, 'image/jpeg', 0.9);
    });

    scene.events.once('shutdown', () => this.pauseButton.destroy());
  }
}

export default HUD;

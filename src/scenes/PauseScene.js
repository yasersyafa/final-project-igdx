import Phaser from 'phaser';
import { SettingsDialog } from '../ui/SettingsDialog.js';
import { bus } from '../core/EventBus.js';
import { EVENTS } from '../config/events.js';

const UI_DEPTH = 2000;

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init({ returnScene, snapshotKey } = {}) {
    this.returnScene = returnScene || 'LevelScene';
    this.snapshotKey = snapshotKey || null;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;

    const background = this.add.image(
      W / 2,
      H / 2,
      this.snapshotKey && this.textures.exists(this.snapshotKey)
        ? this.snapshotKey
        : 'ui_pause_background_maluku',
    )
      .setDisplaySize(W, H)
      .setDepth(UI_DEPTH);
    if (background.postFX) background.postFX.addBlur(0, 2, 2, 1, 0xffffff, 4);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25).setDepth(UI_DEPTH + 0.5);

      this.add.image(W / 2, H * 0.47, 'ui_pause_title')
      .setDisplaySize(600, 402)
      .setDepth(UI_DEPTH + 1);

    this._imageButton(W / 2 - 150, H * 0.565, 'ui_resume_button', () => this.resume());
    this._imageButton(W / 2, H * 0.565, 'ui_settings_button', () => this.settings.open());
    this._imageButton(W / 2 + 150, H * 0.565, 'ui_pause_exit_button', () => this.exitToMenu());

    this.settings = new SettingsDialog(this, UI_DEPTH + 100);
    this.input.keyboard?.once('keydown-ESC', () => this.resume());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.snapshotKey && this.textures.exists(this.snapshotKey)) this.textures.remove(this.snapshotKey);
    });
  }

  _imageButton(x, y, texture, onClick) {
    const button = this.add.image(x, y, texture)
      .setDisplaySize(108, 100)
      .setDepth(UI_DEPTH + 2)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setAlpha(0.84));
    button.on('pointerout', () => button.setAlpha(1));
    button.on('pointerdown', () => {
      bus.emit(EVENTS.UI_BUTTON_CLICK);
      onClick();
    });
    return button;
  }

  resume() {
    this.scene.stop();
    this.scene.resume(this.returnScene);
  }

  exitToMenu() {
    this.scene.stop(this.returnScene);
    this.scene.start('MainMenuScene');
  }
}

export default PauseScene;

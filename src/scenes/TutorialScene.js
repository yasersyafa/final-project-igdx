// TutorialScene — a standalone, non-scored walkthrough of the core controls.
// Mirrors LevelScene's three-system mount (camera/logic/ui) so it gets the real
// CameraTool/HUD/DialogBox for free, then layers a TutorialSequencer on top that
// narrates + gates each step on a real bus event. Reached only from the Main
// Menu — never through LevelSelectScene/CutsceneScene/ResultScene, so it doesn't
// touch level-index-based progress (src/core/progress.js).
import Phaser from 'phaser';
import { bus } from '../core/EventBus.js';
import { EVENTS } from '../config/events.js';
import { fadeScene } from '../anim/motion.js';
import { FONTS, letterSpacing } from '../config/fonts.js';
import { L, t } from '../core/i18n.js';
import { markTutorialSeen } from '../core/settings.js';

import { initCameraSystem } from '../camera/index.js';
import { initLogicSystem } from '../domain/index.js';
import { initUISystem } from '../ui/index.js';
import { makeButton } from '../ui/Button.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { TutorialSequencer } from '../tutorial/TutorialSequencer.js';

import tutorialData from '../data/tutorial.json';

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super('TutorialScene');
  }

  create() {
    const level = tutorialData;
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor(level.bgColor || '#3a3a44');
    fadeScene(this, 'in');

    this.world = this.add.container(0, 0);
    const bg = this.textures.exists(level.background)
      ? this.add.image(W / 2, H / 2, level.background).setDisplaySize(W, H)
      : this.add.rectangle(
          W / 2, H / 2, W, H,
          Phaser.Display.Color.HexStringToColor(level.bgColor || '#3a3a44').color, 1,
        );
    const ground = this.add.rectangle(W / 2, H * 0.86, W, H * 0.28, 0x000000, 0.12);
    this.world.add([bg, ground]);

    const title = this.add
      .text(W / 2, 70, L(level.name), { fontFamily: FONTS.display, fontSize: '26px', letterSpacing: letterSpacing(26), color: '#ffffff' })
      .setOrigin(0.5).setDepth(700).setAlpha(0);
    this.tweens.add({
      targets: title, alpha: 1, duration: 400, yoyo: true, hold: 1400, ease: 'Sine.easeInOut',
      onComplete: () => title.destroy(),
    });

    // --- the three systems, same contract LevelScene uses ---
    initLogicSystem(this, bus, level);
    initCameraSystem(this, bus, level);
    initUISystem(this, bus, level);

    // --- Skip: always available, reachable in any tutorial state ---
    const confirmDialog = new ConfirmDialog(this, 1650);
    makeButton(this, {
      x: W - 96, y: H - 40, w: 152, h: 40, label: t('tutorial.skip'), color: 0x3a4353, fontSize: 14,
      depth: 1700, stopPropagation: true,
      onClick: () => confirmDialog.open({
        message: t('tutorial.skipconfirm'),
        confirmLabel: t('tutorial.skip'),
        cancelLabel: t('btn.cancel'),
        onConfirm: () => this._exitToMenu(),
      }),
    });

    // --- Sequencer: starts once the camera intro settles into IDLE, same beat
    // CameraTool itself waits for (see src/camera/index.js). Note: this
    // deliberately does NOT listen for EVENTS.LEVEL_COMPLETED — Confirm fires it
    // immediately, before the sequencer's closing dialog step plays, and this
    // level is never scored. Navigation back to the menu is driven solely by the
    // sequencer finishing its step list (bus 'tutorial:completed').
    this.sequencer = new TutorialSequencer(this, bus, level.steps);
    this._onCameraReady = () => this.sequencer.start();
    this._onTutorialCompleted = () => this._exitToMenu();
    bus.once(EVENTS.CAMERA_READY, this._onCameraReady);
    bus.once('tutorial:completed', this._onTutorialCompleted);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.CAMERA_READY, this._onCameraReady);
      bus.off('tutorial:completed', this._onTutorialCompleted);
    });
  }

  // Reachable either from the sequencer finishing naturally or from Skip — both
  // routes go through here so listener cleanup only lives in one place.
  _exitToMenu() {
    bus.off(EVENTS.CAMERA_READY, this._onCameraReady);
    bus.off('tutorial:completed', this._onTutorialCompleted);
    this.sequencer.stop();
    markTutorialSeen();
    fadeScene(this, 'out', {
      onComplete: () => this.scene.start('MainMenuScene'),
    });
  }
}

export default TutorialScene;

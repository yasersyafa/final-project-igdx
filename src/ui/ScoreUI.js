// ScoreUI — small score readout, updated on SCORE_UPDATED.
import { EVENTS } from '../config/events.js';
import { checkPop } from '../anim/motion.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

export class ScoreUI {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    const W = scene.cameras.main.width;
    this.label = scene.add.text(W - 24, 24, t('hud.score', { n: 0, max: 0 }), {
      fontFamily: FONTS.body, fontSize: '22px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(depth).setScrollFactor(0);

    this._onUpdate = ({ total, max }) => {
      this.label.setText(t('hud.score', { n: Math.round(total), max }));
      checkPop(this.label); // EXAGGERATION: pop on change
    };
    bus.on(EVENTS.SCORE_UPDATED, this._onUpdate);
    scene.events.once('shutdown', () => bus.off(EVENTS.SCORE_UPDATED, this._onUpdate));
  }
}

export default ScoreUI;

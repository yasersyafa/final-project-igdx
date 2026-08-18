// DialogBox — cozy dialog panel (speaker + lines, click/space to advance).
// Open: ANTICIPATION + SQUASH&STRETCH (popIn Back overshoot), STAGING (dim behind),
// OVERLAPPING ACTION (panel -> speaker -> line stagger in). Close: popOut.
import { EVENTS } from '../config/events.js';
import { popIn, popOut, EASE, DUR } from '../anim/motion.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

const CHAR_DELAY = 28; // ms between characters during the typewriter reveal

export class DialogBox {
  constructor(scene, bus, levelData, depth = 1500) {
    this.scene = scene;
    this.bus = bus;
    this.depth = depth;
    this.open = false;
    this.lines = [];
    this.index = 0;

    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;

    // STAGING: dim overlay behind the panel.
    this.dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0).setDepth(depth);

    // Panel + name tag sized off the source art's own aspect ratio (1106x345 and
    // 371x154) so setDisplaySize never stretches them off-model.
    const pw = 720, ph = Math.round(pw * (345 / 1106));
    const nameW = 190, nameH = Math.round(nameW * (154 / 371));
    this.panel = scene.add.container(W / 2, H - 140).setDepth(depth + 1).setVisible(false);
    const bg = scene.add.image(0, 0, 'ui_dialogue_box').setDisplaySize(pw, ph);
    // Name tag hangs off the box's top edge, tail overlapping into the panel.
    const tagOverlap = 40;
    const tagX = -pw / 2 + 110, tagY = -ph / 2 - nameH / 2 + tagOverlap;
    const nameTag = scene.add.image(tagX, tagY, 'ui_dialogue_name').setDisplaySize(nameW, nameH);
    this.speaker = scene.add.text(tagX, tagY - 6, '', {
      fontFamily: FONTS.body, fontSize: '18px', color: '#BA9075', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.body = scene.add.text(-pw / 2 + 32, -ph / 2 + tagOverlap + 24, '', {
      fontFamily: FONTS.body, fontSize: '20px', color: '#65463D',
      wordWrap: { width: pw - 64 }, lineSpacing: 6,
    }).setOrigin(0, 0);
    this.hint = scene.add.text(pw / 2 - 24, ph / 2 - 26, t('dialog.hint'), {
      fontFamily: FONTS.body, fontSize: '14px', color: '#8a7a6a',
    }).setOrigin(1, 0);
    this.panel.add([bg, nameTag, this.speaker, this.body, this.hint]);

    this._onShow = (d) => this.show(d);
    bus.on(EVENTS.DIALOG_SHOW, this._onShow);

    this._advance = () => { if (this.open) this.next(); };
    scene.input.on('pointerdown', this._advance);
    this.spaceKey = scene.input.keyboard.addKey('SPACE');
    this.spaceKey.on('down', this._advance);

    scene.events.once('shutdown', () => {
      bus.off(EVENTS.DIALOG_SHOW, this._onShow);
      scene.input.off('pointerdown', this._advance);
      this.spaceKey.off('down', this._advance);
      this._stopTyping();
    });
  }

  show({ speaker, lines }) {
    this.open = true;
    this.lines = lines || [];
    this.index = 0;
    this.speaker.setText(speaker || '');
    this.body.setText('');
    this.panel.setVisible(true);
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.45, ease: EASE.out, duration: DUR.base });
    popIn(this.panel, {
      onComplete: () => {
        // OVERLAPPING ACTION: speaker fades in, then first line.
        this.speaker.setAlpha(0);
        this.scene.tweens.add({ targets: this.speaker, alpha: 1, ease: EASE.out, duration: DUR.quick });
        this._renderLine(120);
      },
    });
  }

  // Typewriter reveal: fade the body in, then append one character at a time.
  // next() during typing skips straight to the full line (standard advance-to-complete UX).
  _renderLine(delay = 0) {
    this._stopTyping();
    const chars = [...(this.lines[this.index] || '')]; // spread handles multi-byte chars correctly
    this.body.setText('');
    this.body.setAlpha(0);
    this.scene.tweens.add({ targets: this.body, alpha: 1, ease: EASE.out, duration: DUR.quick, delay });

    this._typing = true;
    this.scene.time.delayedCall(delay, () => {
      if (!this._typing) return; // line already skipped before the fade-in delay elapsed
      let shown = 0;
      this._charTimer = this.scene.time.addEvent({
        delay: CHAR_DELAY,
        repeat: chars.length - 1,
        callback: () => {
          shown++;
          this.body.setText(chars.slice(0, shown).join(''));
          if (shown >= chars.length) this._stopTyping();
        },
      });
    });
  }

  _stopTyping() {
    if (this._charTimer) {
      this._charTimer.remove();
      this._charTimer = null;
    }
    this._typing = false;
  }

  next() {
    if (this._typing) {
      this._stopTyping();
      this.body.setText(this.lines[this.index] || '');
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.index++;
      this._renderLine();
    } else {
      this.close();
    }
  }

  close() {
    this._stopTyping();
    this.open = false;
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0, ease: EASE.in, duration: DUR.base });
    popOut(this.panel, {
      onComplete: () => {
        this.panel.setVisible(true).setScale(1); // reset for next open
        this.panel.setVisible(false);
        this.bus.emit(EVENTS.DIALOG_CLOSED);
      },
    });
  }
}

export default DialogBox;

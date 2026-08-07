// MissionListUI — calm checklist of the level's missions. Renders rows and tracks
// ticks; visibility is owned by the host (Sidebar) via show()/hide(), not by camera
// state directly. A row ticks off LIVE the moment its object is photographed well
// enough (MISSION_CAPTURED), so the player always knows what's left. Ticked rows
// stay ticked across show/hide.
import { EVENTS } from '../config/events.js';
import { popIn, popOut, checkPop } from '../anim/motion.js';
import { FONTS } from '../config/fonts.js';
import { t, L } from '../core/i18n.js';

const DONE_GREEN = 0x9be07a;

export class MissionListUI {
  // opts: { layer } — a Phaser Container to parent every top-level object into
  // (positions stay local-coordinate, e.g. relative to a sidebar panel origin).
  constructor(scene, bus, levelData, depth = 1000, opts = {}) {
    this.scene = scene;
    this.bus = bus;
    this.rows = [];      // { objectId, box, check, text, done }
    this.done = new Set();

    const { layer = null, x = 24, y: startY = 24, wrapWidth = 300 } = opts;
    const objs = levelData.objects.filter((o) => o.mission);
    let y = startY;

    this.title = scene.add.text(x, y, t('hud.shotlist'), {
      fontFamily: FONTS.body, fontSize: '20px', color: '#fff5e6', fontStyle: 'bold',
    }).setDepth(depth);
    if (layer) layer.add(this.title);
    y += 34;

    this.containers = [];
    objs.forEach((o) => {
      const row = scene.add.container(x, y).setDepth(depth);
      const box = scene.add.rectangle(8, 10, 14, 14, 0x000000, 0.25).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.6);
      const check = scene.add.text(8, 9, '✓', {
        fontFamily: FONTS.body, fontSize: '16px', color: '#20242f', fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);
      const text = scene.add.text(26, 0, L(o.mission), {
        fontFamily: FONTS.body, fontSize: '16px', color: '#ffffff',
        wordWrap: { width: wrapWidth },
      }).setOrigin(0, 0);
      row.add([box, check, text]);
      if (layer) layer.add(row);
      this.containers.push(row);
      this.rows.push({ objectId: o.id, box, check, text, done: false });
      y += Math.max(30, text.height + 12);
    });

    this.group = [this.title, ...this.containers];
    this.group.forEach((g) => g.setVisible(false).setScale(0));

    this._onCaptured = ({ objectId }) => this._markDone(objectId);
    this._onSync = ({ capturedIds }) => this._syncDone(capturedIds || []);
    bus.on(EVENTS.MISSION_CAPTURED, this._onCaptured);
    bus.on(EVENTS.MISSIONS_SYNC, this._onSync);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.MISSION_CAPTURED, this._onCaptured);
      bus.off(EVENTS.MISSIONS_SYNC, this._onSync);
    });
  }

  // Tick a mission off. Fire-once per objectId; persists across hide/show.
  _markDone(objectId) {
    if (this.done.has(objectId)) return;
    const row = this.rows.find((r) => r.objectId === objectId);
    if (!row) return;
    this.done.add(objectId);
    this._applyDone(row, true);
  }

  // Reconcile ticks to exactly `capturedIds` (after a photo delete). Tick missing
  // ones without a pop; un-tick rows no longer captured.
  _syncDone(capturedIds) {
    const set = new Set(capturedIds);
    this.rows.forEach((row) => {
      const shouldBe = set.has(row.objectId);
      if (shouldBe && !row.done) { this.done.add(row.objectId); this._applyDone(row, false); }
      else if (!shouldBe && row.done) { this.done.delete(row.objectId); this._applyUndone(row); }
    });
  }

  _applyDone(row, pop) {
    row.done = true;
    row.box.setFillStyle(DONE_GREEN, 1).setStrokeStyle(2, DONE_GREEN, 1);
    row.check.setVisible(true);
    row.text.setColor('#9be07a');
    if (pop) checkPop(row.check); // Back-overshoot pop (only if the row is visible)
  }

  _applyUndone(row) {
    row.done = false;
    row.box.setFillStyle(0x000000, 0.25).setStrokeStyle(2, 0xffffff, 0.6);
    row.check.setVisible(false).setScale(1);
    row.text.setColor('#ffffff');
  }

  show() { this.group.forEach((g, i) => { g.setVisible(true); popIn(g, { delay: i * 40 }); }); }
  hide() { this.group.forEach((g) => popOut(g, { onComplete: () => g.setVisible(false) })); }
}

export default MissionListUI;

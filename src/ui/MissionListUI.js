// MissionListUI — calm checklist of the level's missions, shown while the camera
// is lowered (IDLE). Hidden on CAMERA_RAISED. A row ticks off LIVE the moment its
// object is photographed well enough (MISSION_CAPTURED), so the player always knows
// what's left. Ticked rows stay ticked across raise/lower.
import { EVENTS } from '../config/events.js';
import { popIn, popOut, checkPop } from '../anim/motion.js';

const DONE_GREEN = 0x9be07a;

export class MissionListUI {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    this.rows = [];      // { objectId, box, check, text, done }
    this.done = new Set();

    const objs = levelData.objects.filter((o) => o.mission);
    const x = 24;
    let y = 24;

    this.title = scene.add.text(x, y, 'Shot list', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#fff5e6', fontStyle: 'bold',
    }).setDepth(depth);
    y += 34;

    this.containers = [];
    objs.forEach((o) => {
      const row = scene.add.container(x, y).setDepth(depth);
      const box = scene.add.rectangle(8, 10, 14, 14, 0x000000, 0.25).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.6);
      const check = scene.add.text(8, 9, '✓', {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#20242f', fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);
      const text = scene.add.text(26, 0, o.mission, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff',
        wordWrap: { width: 300 },
      }).setOrigin(0, 0);
      row.add([box, check, text]);
      this.containers.push(row);
      this.rows.push({ objectId: o.id, box, check, text, done: false });
      y += Math.max(30, text.height + 12);
    });

    this.group = [this.title, ...this.containers];
    this.group.forEach((g) => g.setVisible(false).setScale(0));

    this._onRaised = () => this.hide();
    this._onLowered = () => this.show();
    this._onCaptured = ({ objectId }) => this._markDone(objectId);
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    bus.on(EVENTS.MISSION_CAPTURED, this._onCaptured);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
      bus.off(EVENTS.MISSION_CAPTURED, this._onCaptured);
    });
  }

  // Tick a mission off. Fire-once per objectId; persists across hide/show.
  _markDone(objectId) {
    if (this.done.has(objectId)) return;
    const row = this.rows.find((r) => r.objectId === objectId);
    if (!row) return;
    this.done.add(objectId);
    row.done = true;
    row.box.setFillStyle(DONE_GREEN, 1).setStrokeStyle(2, DONE_GREEN, 1);
    row.check.setVisible(true);
    row.text.setColor('#9be07a');
    checkPop(row.check); // Back-overshoot pop (only if the row is currently visible)
  }

  show() { this.group.forEach((g, i) => { g.setVisible(true); popIn(g, { delay: i * 40 }); }); }
  hide() { this.group.forEach((g) => popOut(g, { onComplete: () => g.setVisible(false) })); }
}

export default MissionListUI;

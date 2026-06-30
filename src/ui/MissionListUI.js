// MissionListUI — calm checklist of the level's missions, shown while the camera
// is lowered (IDLE). Hidden on CAMERA_RAISED. Completion is NOT shown live — the
// result panel reveals which missions you actually captured (that's the risk/suspense).
import { EVENTS } from '../config/events.js';
import { popIn, popOut } from '../anim/motion.js';

export class MissionListUI {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    this.rows = [];

    const objs = levelData.objects.filter((o) => o.mission);
    const x = 24;
    let y = 24;

    this.title = scene.add.text(x, y, 'Shot list', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#fff5e6', fontStyle: 'bold',
    }).setDepth(depth);
    y += 34;

    objs.forEach((o) => {
      const row = scene.add.container(x, y).setDepth(depth);
      const box = scene.add.rectangle(8, 10, 14, 14, 0x000000, 0.25).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.6);
      const text = scene.add.text(26, 0, o.mission, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff',
        wordWrap: { width: 300 },
      }).setOrigin(0, 0);
      row.add([box, text]);
      this.rows.push(row);
      y += Math.max(30, text.height + 12);
    });

    this.group = [this.title, ...this.rows];
    this.group.forEach((g) => g.setVisible(false).setScale(0));

    this._onRaised = () => this.hide();
    this._onLowered = () => this.show();
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
    });
  }

  show() { this.group.forEach((g, i) => { g.setVisible(true); popIn(g, { delay: i * 40 }); }); }
  hide() { this.group.forEach((g) => popOut(g, { onComplete: () => g.setVisible(false) })); }
}

export default MissionListUI;

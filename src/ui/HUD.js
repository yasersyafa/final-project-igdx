// HUD — mounts the lowered-camera UI (mission list + controls), the always-on photo
// rail, and the dialog box. Layered above the world/overlay (camera overlay ~800).
import { MissionListUI } from './MissionListUI.js';
import { ControlBar } from './ControlBar.js';
import { PhotoStrip } from './PhotoStrip.js';
import { DialogBox } from './DialogBox.js';

export const HUD_DEPTH = 1000;
export const DIALOG_DEPTH = 1500;

export class HUD {
  constructor(scene, bus, levelData) {
    this.missions = new MissionListUI(scene, bus, levelData, HUD_DEPTH);
    this.controls = new ControlBar(scene, bus, levelData, HUD_DEPTH);
    this.strip = new PhotoStrip(scene, bus, levelData, HUD_DEPTH);
    this.dialog = new DialogBox(scene, bus, levelData, DIALOG_DEPTH);
  }
}

export default HUD;

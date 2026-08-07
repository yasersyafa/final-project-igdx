// HUD — mounts the sidebar drawer (shot list + photo roll tabs), the lowered-camera
// controls, and the dialog box. Layered above the world/overlay (camera overlay ~800).
import { Sidebar } from './Sidebar.js';
import { ControlBar } from './ControlBar.js';
import { DialogBox } from './DialogBox.js';

export const HUD_DEPTH = 1000;
export const SIDEBAR_DEPTH = 1050; // above ControlBar's tip/confirm, below dialogs
export const DIALOG_DEPTH = 1500;

export class HUD {
  constructor(scene, bus, levelData) {
    this.controls = new ControlBar(scene, bus, levelData, HUD_DEPTH);
    this.sidebar = new Sidebar(scene, bus, levelData, SIDEBAR_DEPTH);
    this.dialog = new DialogBox(scene, bus, levelData, DIALOG_DEPTH);
  }
}

export default HUD;

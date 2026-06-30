// Camera system entry point. Wires CameraTool, plays the intro, then goes IDLE.
import { EVENTS } from '../config/events.js';
import { CameraTool } from './CameraTool.js';
import { playCameraIntro } from './CameraIntro.js';

export function initCameraSystem(scene, bus, levelData) {
  const tool = new CameraTool(scene, bus);
  playCameraIntro(scene, bus, scene.world);
  bus.once(EVENTS.CAMERA_READY, () => tool.enterIdle());
  console.log('[camera] camera system loaded:', levelData.id);
  return tool;
}

export default initCameraSystem;

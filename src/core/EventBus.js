// Singleton event bus — shared Phaser EventEmitter instance.
// All cross-system communication goes through this using EVENTS names.
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();
export default bus;

// TutorialSequencer — walks a list of tutorial steps, gating each one on a real
// bus event so the player actually performs the action being taught instead of
// just clicking through text. Two kinds of step:
//   phase: "idle"   -> narrated via the existing DialogBox (EVENTS.DIALOG_SHOW),
//                      safe because the player is in IDLE (camera lowered) already.
//   phase: "aiming" -> narrated via Callout instead, since DIALOG_SHOW would force
//                      CameraTool to lower the camera mid-explanation (see CameraTool
//                      ._wireBus() onDialogShow) — Callout doesn't touch that event.
// A step advances when its `waitFor` event name (a key into EVENTS) fires, or
// immediately once shown if it has no waitFor (e.g. pure narration beats).
import { EVENTS } from '../config/events.js';
import { createStateMachine } from '../core/stateMachine.js';
import { L } from '../core/i18n.js';
import { Callout } from '../ui/Callout.js';

const STATES = ['idle', 'showing', 'waiting', 'done'];

export class TutorialSequencer {
  constructor(scene, bus, steps, { depth = 1400 } = {}) {
    this.scene = scene;
    this.bus = bus;
    this.steps = steps || [];
    this.index = -1;
    this.callout = new Callout(scene, depth);
    this.sm = createStateMachine('idle', STATES);

    this._waitHandler = null;
    this._waitEventName = null;
    this._onDialogClosed = null;

    scene.events.once('shutdown', () => this.stop());
  }

  start() {
    this.render(0);
  }

  render(i) {
    if (i >= this.steps.length) { this._finish(); return; }
    this.index = i;
    this.sm.transition('showing');
    const step = this.steps[i];

    if (step.phase === 'aiming') {
      this._afterIntro(step);
      return;
    }

    this._onDialogClosed = () => this._afterIntro(step);
    this.bus.once(EVENTS.DIALOG_CLOSED, this._onDialogClosed);
    this.bus.emit(EVENTS.DIALOG_SHOW, {
      speaker: L(step.dialog.speaker),
      lines: (step.dialog.lines || []).map(L),
    });
  }

  // Dialog (if any) has closed, or this was an "aiming" step with no dialog —
  // show the Callout (if the step points at something) and set up the gate.
  _afterIntro(step) {
    this._onDialogClosed = null;
    if (step.highlight) this.callout.show(step.highlight, L(step.text));

    if (step.waitFor && EVENTS[step.waitFor]) {
      this.sm.transition('waiting');
      this._waitEventName = EVENTS[step.waitFor];
      this._waitHandler = () => this._advance();
      this.bus.once(this._waitEventName, this._waitHandler);
    } else {
      this._advance();
    }
  }

  _advance() {
    this._waitHandler = null;
    this._waitEventName = null;
    this.callout.hide();
    this.render(this.index + 1);
  }

  _finish() {
    this.sm.transition('done');
    this.callout.hide();
    this.bus.emit('tutorial:completed');
  }

  // Called by a Skip button, or scene shutdown — tears down any pending
  // listener so a stray event after skipping can't resurrect the sequence.
  stop() {
    if (this._waitHandler && this._waitEventName) this.bus.off(this._waitEventName, this._waitHandler);
    if (this._onDialogClosed) this.bus.off(EVENTS.DIALOG_CLOSED, this._onDialogClosed);
    this._waitHandler = null;
    this._onDialogClosed = null;
    this.callout.destroy();
  }
}

export default TutorialSequencer;

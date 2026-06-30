// Tiny finite state machine helper. Drives the camera capture flow.
export function createStateMachine(initial, states = []) {
  const valid = new Set(states.length ? states : [initial]);
  valid.add(initial);
  const enterCbs = {}; // state -> [cb]
  let current = initial;

  const sm = {
    get state() {
      return current;
    },
    is(state) {
      return current === state;
    },
    onEnter(state, cb) {
      (enterCbs[state] ||= []).push(cb);
      return sm;
    },
    transition(to) {
      if (!valid.has(to)) {
        console.warn(`[stateMachine] unknown state: ${to}`);
        valid.add(to);
      }
      if (to === current) return sm;
      current = to;
      (enterCbs[to] || []).forEach((cb) => cb(current));
      return sm;
    },
  };
  return sm;
}

export default createStateMachine;

// Keyboard and mouse input. Held keys give pitch, roll and throttle; one-shot presses
// (start, pause, camera) are queued as bit flags and taken once by the loop. The mouse
// steers too: hold the left button and the pointer's offset from the centre banks and
// pitches the plane, so the game plays with keyboard and mouse alike.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;

const PITCH_UP = new Set(['ArrowUp', 'KeyI']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyK']);
const ROLL_LEFT = new Set(['ArrowLeft', 'KeyA', 'KeyJ']);
const ROLL_RIGHT = new Set(['ArrowRight', 'KeyD', 'KeyL']);
const THROTTLE_UP = new Set(['KeyW']);
const THROTTLE_DOWN = new Set(['KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CAMERA = new Set(['KeyC']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseSteer = { x: 0, y: 0, active: false };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (CAMERA.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CAMERA;
    } else if (
      PITCH_UP.has(event.code) || PITCH_DOWN.has(event.code) ||
      ROLL_LEFT.has(event.code) || ROLL_RIGHT.has(event.code) ||
      THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)
    ) {
      held.add(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouseSteer.active = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    mouseSteer.active = true;
    mouseSteer.x = 0;
    mouseSteer.y = 0;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!mouseSteer.active) return;
    const rect = canvas.getBoundingClientRect();
    mouseSteer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseSteer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });
  const releaseMouse = () => {
    mouseSteer.active = false;
  };
  canvas.addEventListener('pointerup', releaseMouse);
  canvas.addEventListener('pointercancel', releaseMouse);

  function axis(upSet, downSet) {
    let value = 0;
    for (const code of upSet) if (held.has(code)) value += 1;
    for (const code of downSet) if (held.has(code)) value -= 1;
    return Math.max(-1, Math.min(1, value));
  }

  return {
    /** { pitch, roll, throttle } each in -1..1, up / right / more throttle positive. */
    read() {
      let pitch = axis(PITCH_UP, PITCH_DOWN);
      let roll = axis(ROLL_RIGHT, ROLL_LEFT);
      const throttle = axis(THROTTLE_UP, THROTTLE_DOWN);
      if (mouseSteer.active) {
        roll = Math.max(-1, Math.min(1, roll + mouseSteer.x * 0.9));
        pitch = Math.max(-1, Math.min(1, pitch - mouseSteer.y * 0.9));
      }
      return { pitch, roll, throttle };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

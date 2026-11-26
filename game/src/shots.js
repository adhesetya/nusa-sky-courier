// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh game for a fixed number of steps, steered by an autopilot that aims at the
// next ring (or the runway, once the rings are done), so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP, WORLD } from './config.js';

const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 900;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The autopilot: throttle toward a target speed, bank toward the target's bearing, pitch
 * toward a target altitude, and never fly into a hillside. It returns the same input the
 * human stick gives: { pitch, roll, throttle } in -1..1.
 */
export function createAutopilot(flight, rings, terrain) {
  function input() {
    const s = flight.state;
    const target = rings.target();
    let targetPoint;
    let targetThrottle = 0.75;

    if (s.status === 'landed') {
      // Spool up and rotate off the runway.
      return { pitch: 0.7, roll: 0, throttle: 1 };
    }

    if (target) {
      targetPoint = { x: target.x, y: target.y, z: target.z };
      const dx = target.x - s.pos.x;
      const dz = target.z - s.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 250) targetThrottle = 0.55;
    } else {
      // All rings done: line up east of the runway, then fly a straight final over the
      // strip toward a point past its far end. Aiming past the runway — not at its
      // centre — keeps the plane on a straight centreline instead of orbiting the
      // middle of the strip at turn radius.
      const distRunway = Math.hypot(s.pos.x, s.pos.z);
      if (distRunway > 350) {
        targetPoint = { x: 350, y: 70, z: 0 };
        targetThrottle = 0.7;
      } else {
        targetPoint = { x: -150, y: WORLD.runwayHeight + 1, z: 0 };
        targetThrottle = 0.35;
      }
    }

    // Bearing to the target, in the same heading convention as the flight model.
    const dx = targetPoint.x - s.pos.x;
    const dz = targetPoint.z - s.pos.z;
    const desiredYaw = Math.atan2(dx, -dz);
    const yawError = wrapAngle(desiredYaw - s.yaw);
    const roll = clamp(yawError * 1.6, -0.9, 0.9);

    // Altitude: hold the ring's own height when close to it — the rings sit clear of
    // the ground by design — and only enforce a ground-clearance floor from far away,
    // or the floor would hold the plane above the ring and it could never pass through.
    // On final approach the glide slope is the plan and takes no floor: it is keyed to
    // how far east of the runway centre the plane is, so it meets the strip.
    const groundH = terrain.heightAt(s.pos.x, s.pos.z);
    let desiredAlt = targetPoint.y;
    const distToTarget = Math.hypot(targetPoint.x - s.pos.x, targetPoint.z - s.pos.z);
    if (target && distToTarget > 200) desiredAlt = Math.max(desiredAlt, groundH + 45);
    else if (target) desiredAlt = targetPoint.y;
    else if (Math.hypot(s.pos.x, s.pos.z) > 350) desiredAlt = Math.max(desiredAlt, groundH + 45);
    else desiredAlt = WORLD.runwayHeight + 1 + Math.max(0, s.pos.x) * 0.1;
    let pitch = clamp((desiredAlt - s.pos.y) * 0.045, -1, 1);
    // Terrain dead ahead and close: pull up hard. (No flare on final: the glide slope
    // already touches down gently, and a flare would balloon the plane back up.)
    if (flight.altitudeAgl < 28 && target) pitch = 1;

    const throttle = clamp((targetThrottle - s.throttle) * 2.5, -1, 1);
    return { pitch, roll, throttle };
  }

  return { input };
}

/**
 * Set the game to the named scene (start, play or end; any other name is start) by playing
 * the real rules forward, and return the screen to draw over it.
 */
export function stageShot(name, api) {
  api.reset();
  if (name !== 'play' && name !== 'end') {
    return { screen: 'title' };
  }
  const autopilot = api.autopilot;
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      api.stepSim(STEP, autopilot.input());
      if (api.flight.state.status === 'crashed') break;
    }
    return { screen: 'play' };
  }
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const events = api.stepSim(STEP, autopilot.input());
    // A coarse trace for tuning the autopilot: one line every 10 s of sim time.
    if (i % 600 === 0) {
      const s = api.flight.state;
      (window.__trace = window.__trace || []).push(
        `${Math.round(i * STEP)}s pos=(${Math.round(s.pos.x)},${Math.round(s.pos.y)},${Math.round(s.pos.z)}) spd=${Math.round(s.speed * 3.6)} rings=${api.rings.passed} lives=${s.lives} status=${s.status}`,
      );
    }
    if (events.mission) return { screen: 'win' };
    if (events.crashed) {
      const s = api.flight.state;
      (window.__trace = window.__trace || []).push(
        `${Math.round(i * STEP)}s CRASH at (${Math.round(s.pos.x)},${Math.round(s.pos.y)},${Math.round(s.pos.z)}) lives=${s.lives}`,
      );
      if (api.flight.state.lives <= 0) return { screen: 'over' };
      api.respawn();
    }
    if (events.landed) {
      const s = api.flight.state;
      (window.__trace = window.__trace || []).push(
        `${Math.round(i * STEP)}s LANDED at (${Math.round(s.pos.x)},${Math.round(s.pos.y)},${Math.round(s.pos.z)})`,
      );
    }
  }
  // The mission only counts as won when every ring is done and the plane is back on the
  // runway; anything else is still a game in progress.
  const won = api.flight.state.status === 'landed' && api.rings.done;
  return { screen: won ? 'win' : 'play' };
}

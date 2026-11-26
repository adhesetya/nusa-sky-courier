// The flight model: an arcade plane. Throttle sets a target speed, bank turns the plane,
// pitch trades speed for height, and below stall speed the plane sinks. The ground is the
// terrain's heightAt, so a gentle touch on the runway is a landing and anything else is a
// crash; ditching in the sea is a crash too. Heading 0 is north (-Z), 90 is east (+X).
import * as THREE from 'three';
import {
  CRASH_PENALTY,
  FUEL,
  LANDING_POINTS,
  LIVES,
  PLANE,
  RINGS,
  START,
  TIME_BONUS_MAX,
  WORLD,
} from './config.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerpToward(value, target, rate, dt) {
  const diff = target - value;
  const step = clamp(diff, -rate * dt, rate * dt);
  return value + step;
}

export function createFlight(terrain, rings) {
  const state = {
    pos: new THREE.Vector3(START.x, START.y, START.z),
    yaw: START.heading,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: FUEL.capacity,
    verticalSpeed: 0,
    status: 'landed', // landed | flying | crashed
    lives: LIVES,
    score: 0,
    missionTime: 0,
    best: 0,
  };

  function forward() {
    const cp = Math.cos(state.pitch);
    return new THREE.Vector3(
      Math.sin(state.yaw) * cp,
      Math.sin(state.pitch),
      -Math.cos(state.yaw) * cp,
    );
  }

  function onRunway() {
    return (
      Math.abs(state.pos.x) <= WORLD.runwayLength / 2 &&
      Math.abs(state.pos.z) <= WORLD.runwayWidth / 2
    );
  }

  function resetToRunway() {
    state.pos.set(START.x, START.y, START.z);
    state.yaw = START.heading;
    state.pitch = 0;
    state.roll = 0;
    state.speed = 0;
    state.throttle = 0;
    state.fuel = FUEL.capacity;
    state.verticalSpeed = 0;
    state.status = 'landed';
  }

  /**
   * One fixed step. `input` is { pitch: -1..1 (up positive), roll: -1..1 (right positive),
   * throttle: -1..1 }. Returns events: { crashed, landed, tookOff, mission, ring, fuel }.
   */
  function step(dt, input) {
    const events = { crashed: false, landed: false, tookOff: false, mission: false, ring: false, fuel: false };
    if (state.status === 'crashed') return events;

    state.missionTime += dt;

    // Throttle and speed.
    if (state.fuel <= 0) state.throttle = 0;
    else state.throttle = clamp(state.throttle + input.throttle * 0.7 * dt, 0, 1);
    const targetSpeed = state.throttle * PLANE.maxSpeed;
    const accel = targetSpeed > state.speed ? PLANE.accel : PLANE.accel * 1.4;
    state.speed += clamp(targetSpeed - state.speed, -accel * dt, accel * dt);

    // Attitude follows the stick, easing back to level when released.
    state.pitch = lerpToward(state.pitch, input.pitch * PLANE.maxPitch, 2.2, dt);
    state.roll = lerpToward(state.roll, input.roll * PLANE.maxRoll, 3.0, dt);
    if (state.status === 'landed') {
      state.yaw += state.roll * 0.25 * dt * (state.speed / 20);
    } else {
      state.yaw += state.roll * PLANE.turnRate * (0.4 + 0.6 * (state.speed / PLANE.maxSpeed)) * dt;
    }

    // Move.
    const fwd = forward();
    let vy = fwd.y * state.speed;
    if (state.status === 'flying' && state.speed < PLANE.stallSpeed) {
      vy -= PLANE.sinkRate * (1 - state.speed / PLANE.stallSpeed);
    }
    state.verticalSpeed = vy;
    state.pos.x += fwd.x * state.speed * dt;
    state.pos.z += fwd.z * state.speed * dt;
    state.pos.y += vy * dt;

    // Fuel drains with throttle while the engine runs.
    if (state.throttle > 0 && state.status !== 'crashed') {
      state.fuel = Math.max(0, state.fuel - state.throttle * FUEL.drainPerSecond * dt);
    }

    const groundH = terrain.heightAt(state.pos.x, state.pos.z);

    // Ditching: the sea is unforgiving below a metre.
    if (groundH < 2 && state.pos.y <= 1.0) {
      return crash(events);
    }

    if (state.status === 'landed') {
      state.pos.y = WORLD.runwayHeight + 1.5;
      if (state.speed > 40 && state.pitch > 0.08) {
        state.status = 'flying';
        state.pitch = Math.max(state.pitch, 0.14);
        events.tookOff = true;
      } else if (state.speed > 0) {
        // Brakes when the throttle is closed, light rolling drag when it is open, so the
        // engine can still spool the plane up to rotation speed on the runway.
        const drag = state.throttle < 0.3 ? 26 : 6;
        state.speed = Math.max(0, state.speed - drag * dt);
      }
      return events;
    }

    // Touching the ground while flying: a landing or a crash.
    if (state.pos.y <= groundH + 1.5) {
      const gentle =
        onRunway() &&
        Math.abs(state.verticalSpeed) <= 6 &&
        state.speed <= 55 &&
        Math.abs(state.roll) < 0.35 &&
        Math.abs(state.pitch) < 0.28;
      if (gentle) {
        state.status = 'landed';
        state.pos.y = WORLD.runwayHeight + 1.5;
        state.pitch = 0;
        state.roll = 0;
        state.fuel = FUEL.capacity;
        events.landed = true;
        if (rings.done) {
          const timeBonus = Math.max(0, TIME_BONUS_MAX - Math.floor(state.missionTime));
          state.score += LANDING_POINTS + timeBonus;
          events.mission = true;
        }
        return events;
      }
      return crash(events);
    }

    // Rings.
    const hit = rings.check(state.pos.x, state.pos.y, state.pos.z);
    if (hit.ring) {
      state.score += RINGS.points;
      state.fuel = Math.min(FUEL.capacity, state.fuel + FUEL.ringBonus);
      events.ring = true;
    }
    if (hit.fuel) {
      state.fuel = Math.min(FUEL.capacity, state.fuel + FUEL.fuelRingBonus);
      events.fuel = true;
    }
    return events;
  }

  function crash(events) {
    state.status = 'crashed';
    state.score = Math.max(0, state.score - CRASH_PENALTY);
    state.lives -= 1;
    events.crashed = true;
    return events;
  }

  function respawn() {
    resetToRunway();
  }

  function reset() {
    resetToRunway();
    state.lives = LIVES;
    state.score = 0;
    state.missionTime = 0;
    rings.reset();
  }

  return {
    state,
    step,
    respawn,
    reset,
    onRunway,
    forward,
    get headingDeg() {
      const deg = (state.yaw * 180) / Math.PI;
      return ((deg % 360) + 360) % 360;
    },
    get speedKmh() {
      return Math.round(state.speed * 3.6);
    },
    get altitudeAgl() {
      return Math.max(0, Math.round(state.pos.y - terrain.heightAt(state.pos.x, state.pos.z)));
    },
    get altitudeMsl() {
      return Math.max(0, Math.round(state.pos.y));
    },
  };
}

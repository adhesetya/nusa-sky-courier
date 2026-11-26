// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between five screens:
// title, play, paused, crash (a short freeze, then back to the runway) and mission
// complete. ?seed=N fixes the islands. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from 'three';
import { BEST_KEY, PALETTE, STEP, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createTerrain } from './terrain.js';
import { buildAircraft } from './aircraft.js';
import { createRings } from './rings.js';
import { createFlight } from './flight.js';
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createAutopilot, stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const CRASH_FREEZE = 1.4;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : shot ? 1 : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fogNear, WORLD.fogFar);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);

const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
sun.position.set(600, 900, 300);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9e8, 0x3d5a3a, 1.0));

const terrain = createTerrain(seed);
scene.add(terrain.group);
const aircraft = buildAircraft();
aircraft.group.rotation.order = 'YXZ';
scene.add(aircraft.group);
const rings = createRings(scene);
const flight = createFlight(terrain, rings);
const hud = createHud();
const audio = createAudio();
const autopilot = createAutopilot(flight, rings, terrain);

let cameraMode = 'chase'; // chase | cockpit | shot-start
let time = 0;
const camTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

flight.state.best = readBest();

function updateAircraft(dt) {
  const s = flight.state;
  aircraft.group.position.copy(s.pos);
  aircraft.group.rotation.y = -s.yaw;
  aircraft.group.rotation.x = s.pitch;
  aircraft.group.rotation.z = -s.roll;
  aircraft.setPropeller(s.throttle, dt);
}

function updateCamera(dt) {
  const s = flight.state;
  if (cameraMode === 'shot-start') {
    // A three-quarter view that puts the plane in the lower-left, clear of the title
    // panel: the aircraft on the runway, islands and a ring behind it.
    camera.position.set(s.pos.x - 25, s.pos.y + 14, s.pos.z + 45);
    camera.lookAt(s.pos.x + 30, s.pos.y + 16, s.pos.z - 20);
    return;
  }
  if (cameraMode === 'cockpit') {
    const eye = aircraft.group.localToWorld(new THREE.Vector3(0, 1.15, -1.2));
    const ahead = aircraft.group.localToWorld(new THREE.Vector3(0, 0.9, -60));
    camera.position.copy(eye);
    camera.lookAt(ahead);
    return;
  }
  // Chase: settle behind and above the plane, looking ahead of it.
  const back = new THREE.Vector3(-Math.sin(s.yaw), 0, Math.cos(s.yaw));
  camTarget.copy(s.pos).addScaledVector(back, 12);
  camTarget.y = s.pos.y + 3.8;
  const k = 1 - Math.exp(-5 * dt);
  camera.position.lerp(camTarget, k);
  const fwd = flight.forward();
  lookTarget.copy(s.pos).addScaledVector(fwd, 30);
  lookTarget.y += 1;
  camera.lookAt(lookTarget);
}

/** Advance the world one fixed step with the given stick input; returns flight events. */
function stepSim(dt, input) {
  const events = flight.step(dt, input);
  time += dt;
  terrain.update(dt);
  rings.update(time);
  updateAircraft(dt);
  updateCamera(dt);
  return events;
}

function render() {
  hud.update(flight, rings);
  renderer.render(scene, camera);
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  cameraMode = name === 'start' ? 'shot-start' : 'chase';
  const staged = stageShot(name, {
    flight,
    rings,
    autopilot,
    reset() {
      flight.reset();
      flight.state.best = readBest();
      aircraft.group.visible = true;
      time = 0;
      camera.position.set(0, 60, 120);
    },
    stepSim,
    respawn() {
      flight.respawn();
      aircraft.group.visible = true;
    },
  });
  if (staged.screen === 'title') {
    cameraMode = 'shot-start';
    hud.showPanel('title');
  } else if (staged.screen === 'win') {
    hud.showPanel('win');
    hud.fillStats('panel-win', {
      score: `Score ${flight.state.score}`,
      time: `Time ${Math.round(flight.state.missionTime)}s`,
      best: `Best ${flight.state.best}`,
    });
  } else if (staged.screen === 'over') {
    hud.showPanel('over');
  } else {
    hud.showPanel(null);
  }
  let painted = 0;
  function paint() {
    // Position the camera for the shot (the title scene runs no simulation steps,
    // so nothing else moves it) and paint twice, as the starter does.
    updateCamera(1 / 60);
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      const s = flight.state;
      window.__shotReady = true;
      window.__shotState = {
        screen: staged.screen,
        score: s.score,
        rings: rings.passed,
        lives: s.lives,
        status: s.status,
        pos: [Math.round(s.pos.x), Math.round(s.pos.y), Math.round(s.pos.z)],
        speedKmh: flight.speedKmh,
        altitudeAgl: flight.altitudeAgl,
      };
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let crashTimer = 0;

  function startGame() {
    flight.reset();
    flight.state.best = readBest();
    aircraft.group.visible = true;
    crashTimer = 0;
    cameraMode = 'chase';
    screen = 'play';
    hud.showPanel(null);
    audio.unlock();
    announce('Flying. Five gold rings, then land on the runway.');
  }

  function endGame(win) {
    if (flight.state.score > flight.state.best) {
      flight.state.best = flight.state.score;
      saveBest(flight.state.best);
    }
    if (win) {
      screen = 'win';
      hud.showPanel('win');
      hud.fillStats('panel-win', {
        score: `Score ${flight.state.score}`,
        time: `Time ${Math.round(flight.state.missionTime)}s`,
        best: `Best ${flight.state.best}`,
      });
      announce(`Mission complete. Score ${flight.state.score}.`);
    } else {
      screen = 'over';
      hud.showPanel('over');
      hud.fillStats('panel-over', {
        score: `Score ${flight.state.score}`,
        lives: `Lives ${flight.state.lives}`,
      });
      announce(`Game over. Score ${flight.state.score}.`);
    }
  }

  function handleEvents(events) {
    if (events.ring) {
      audio.chime();
      hud.showMessage(`RING ${rings.passed}/${rings.total}  +100`);
    }
    if (events.fuel) {
      audio.fuelChime();
      hud.showMessage('FUEL +45');
    }
    if (events.tookOff) {
      hud.showMessage('AIRBORNE');
    }
    if (events.landed && !events.mission) {
      audio.thud();
      hud.showMessage('LANDED — FUEL FULL');
    }
    if (events.mission) {
      audio.thud();
      endGame(true);
    }
    if (events.crashed) {
      audio.crashSound();
      aircraft.group.visible = false;
      crashTimer = CRASH_FREEZE;
      hud.showMessage('CRASHED', 1400);
      announce('Crashed.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CAMERA && screen === 'play') {
      cameraMode = cameraMode === 'cockpit' ? 'chase' : 'cockpit';
      hud.showMessage(cameraMode === 'cockpit' ? 'COCKPIT VIEW' : 'CHASE VIEW', 1200);
    }
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over' || screen === 'win')) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      hud.showPanel('paused');
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      hud.showPanel(null);
      announce('Flying.');
    }
  }

  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'title') {
      time += 1 / 60;
      terrain.update(1 / 60);
      rings.update(time);
      updateAircraft(1 / 60);
      updateCamera(1 / 60);
      audio.engine(0, 0, false);
    } else if (screen === 'play') {
      if (crashTimer > 0) {
        crashTimer -= 1 / 60;
        if (crashTimer <= 0) {
          if (flight.state.lives <= 0) endGame(false);
          else {
            flight.respawn();
            aircraft.group.visible = true;
            hud.showMessage(`BACK ON THE RUNWAY — ${flight.state.lives} LIVES LEFT`);
          }
        }
      } else {
        while (accumulator >= STEP) {
          handleEvents(stepSim(STEP, input.read()));
          accumulator -= STEP;
          if (screen !== 'play') break;
        }
        audio.engine(flight.state.throttle, flight.state.speed, flight.state.status === 'flying');
      }
    }
    render();
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      hud.showPanel('paused');
      announce('Paused.');
    }
  });

  // The title scene sits behind the panel: park the plane on the runway and frame it.
  cameraMode = 'shot-start';
  hud.showPanel('title');
  announce('Nusa Sky Courier. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

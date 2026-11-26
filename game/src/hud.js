// The HUD: DOM panels over the 3D view, lit in green so they read at a glance in a
// screenshot — altitude, speed, heading with a compass letter, vertical speed, fuel and
// throttle bars, score, rings and the best score, plus a centre message line. Panels for
// the title, pause, crash and mission-complete screens live in index.html and are shown
// and hidden from here.
import { FUEL } from './config.js';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function compassLetter(headingDeg) {
  return COMPASS[Math.round(headingDeg / 45) % 8];
}

export function createHud() {
  const el = (id) => document.getElementById(id);
  const alt = el('hud-alt');
  const spd = el('hud-spd');
  const hdg = el('hud-hdg');
  const vs = el('hud-vs');
  const fuelBar = el('hud-fuel-bar');
  const fuelText = el('hud-fuel-text');
  const thrBar = el('hud-thr-bar');
  const score = el('hud-score');
  const rings = el('hud-rings');
  const best = el('hud-best');
  const message = el('hud-message');
  const panels = {
    title: el('panel-title'),
    paused: el('panel-paused'),
    over: el('panel-over'),
    win: el('panel-win'),
  };

  let messageUntil = 0;
  let last = {};

  function setText(node, key, value) {
    if (last[key] !== value) {
      last[key] = value;
      node.textContent = value;
    }
  }

  /** Refresh every HUD number from the flight state. Call every frame. */
  function update(flight, ringState) {
    const s = flight.state;
    setText(alt, 'alt', `ALT ${flight.altitudeAgl} m`);
    setText(spd, 'spd', `SPD ${flight.speedKmh} km/h`);
    const heading = Math.round(flight.headingDeg);
    setText(hdg, 'hdg', `HDG ${String(heading).padStart(3, '0')}° ${compassLetter(heading)}`);
    const vsValue = s.verticalSpeed;
    setText(vs, 'vs', `V/S ${vsValue >= 0 ? '+' : ''}${vsValue.toFixed(1)} m/s`);
    const fuelPct = Math.max(0, Math.round((s.fuel / FUEL.capacity) * 100));
    fuelBar.style.width = `${fuelPct}%`;
    fuelBar.className = fuelPct <= 20 ? 'bar-fill danger' : fuelPct <= 40 ? 'bar-fill warn' : 'bar-fill';
    setText(fuelText, 'fuel', `FUEL ${fuelPct}%`);
    thrBar.style.width = `${Math.round(s.throttle * 100)}%`;
    setText(score, 'score', `SCORE ${s.score}`);
    setText(rings, 'rings', `RINGS ${ringState.passed}/${ringState.total}`);
    setText(best, 'best', `BEST ${s.best}`);
    if (messageUntil && performance.now() > messageUntil) {
      message.textContent = '';
      messageUntil = 0;
    }
  }

  /** A centre message that fades after `ms` milliseconds. */
  function showMessage(text, ms = 2200) {
    message.textContent = text;
    messageUntil = performance.now() + ms;
  }

  function showPanel(name) {
    for (const [key, node] of Object.entries(panels)) {
      node.classList.toggle('hidden', key !== name);
    }
  }

  function fillStats(panelId, lines) {
    const node = el(panelId);
    node.querySelectorAll('[data-stat]').forEach((line) => {
      const key = line.getAttribute('data-stat');
      if (lines[key] !== undefined) line.textContent = lines[key];
    });
  }

  return { update, showMessage, showPanel, fillStats };
}

// The rings: five gold target rings in flight order, two green fuel rings, each with a light
// column so the next one is findable from anywhere. A ring is passed when the plane comes
// within its radius of the centre; the next ring pulses gold, passed ones turn green.
import * as THREE from 'three';
import { FUEL_RINGS, PALETTE, RING_PATH, RINGS } from './config.js';

function makeRing(x, y, z, color) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(RINGS.radius, 0.9, 12, 40),
    new THREE.MeshBasicMaterial({ color }),
  );
  group.add(torus);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(RINGS.radius, 2.2, 8, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }),
  );
  group.add(halo);
  // A soft light column above the ring, visible across the islands.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 160, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 80;
  group.add(beam);
  return { group, torus, halo, beam, x, y, z };
}

export function createRings(scene) {
  const targets = RING_PATH.map((p) => makeRing(p.x, p.y, p.z, PALETTE.ringGold));
  const fuels = FUEL_RINGS.map((p) => makeRing(p.x, p.y, p.z, PALETTE.ringFuel));
  for (const ring of [...targets, ...fuels]) scene.add(ring.group);

  let next = 0;
  const fuelTaken = new Set();

  function setColour(ring, color) {
    ring.torus.material.color.setHex(color);
    ring.halo.material.color.setHex(color);
    ring.beam.material.color.setHex(color);
  }

  /** Pulse the next ring and dim the passed ones. Call every frame. */
  function update(time) {
    targets.forEach((ring, index) => {
      if (index < next) {
        setColour(ring, PALETTE.ringDone);
        ring.beam.material.opacity = 0.03;
      } else if (index === next) {
        const pulse = 1 + Math.sin(time * 3.2) * 0.07;
        ring.group.scale.setScalar(pulse);
        ring.beam.material.opacity = 0.1 + Math.sin(time * 3.2) * 0.05;
      } else {
        ring.group.scale.setScalar(1);
        ring.beam.material.opacity = 0.05;
      }
    });
    fuels.forEach((ring, index) => {
      if (fuelTaken.has(index)) {
        ring.group.visible = false;
      } else {
        ring.group.scale.setScalar(1 + Math.sin(time * 2.4 + index * 2) * 0.05);
      }
    });
  }

  /** Check the plane against the next gold ring and both fuel rings. Returns events. */
  function check(px, py, pz) {
    const events = { ring: false, fuel: false };
    if (next < targets.length) {
      const ring = targets[next];
      const dx = px - ring.x;
      const dy = py - ring.y;
      const dz = pz - ring.z;
      if (dx * dx + dy * dy + dz * dz < RINGS.radius * RINGS.radius) {
        next += 1;
        events.ring = true;
      }
    }
    fuels.forEach((ring, index) => {
      if (fuelTaken.has(index)) return;
      const dx = px - ring.x;
      const dy = py - ring.y;
      const dz = pz - ring.z;
      if (dx * dx + dy * dy + dz * dz < RINGS.radius * RINGS.radius) {
        fuelTaken.add(index);
        events.fuel = true;
      }
    });
    return events;
  }

  function target() {
    return next < targets.length ? targets[next] : null;
  }

  function reset() {
    next = 0;
    fuelTaken.clear();
    for (const ring of [...targets, ...fuels]) ring.group.visible = true;
  }

  return {
    update,
    check,
    target,
    reset,
    get passed() {
      return next;
    },
    get total() {
      return targets.length;
    },
    get done() {
      return next >= targets.length;
    },
  };
}

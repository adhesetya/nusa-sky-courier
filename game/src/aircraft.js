// The aircraft: a single-engine island mail plane built from primitives — cream fuselage,
// teal wings, an orange stripe, a glass canopy and a spinning propeller. Nose points along
// -Z, so the group is rotated with yaw about Y, pitch about X and roll about Z (negated).
import * as THREE from 'three';
import { PALETTE } from './config.js';

function part(geometry, color, x, y, z, roughness = 0.6) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.15 }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildAircraft() {
  const plane = new THREE.Group();

  // Fuselage: a cylinder along Z with a tapered tail cone and a rounded nose.
  const body = part(new THREE.CylinderGeometry(1.0, 0.75, 5.6, 14), PALETTE.fuselage, 0, 0, 0);
  body.rotation.x = Math.PI / 2;
  plane.add(body);
  const nose = part(new THREE.ConeGeometry(1.0, 1.6, 14), PALETTE.fuselage, 0, 0, -3.5);
  nose.rotation.x = -Math.PI / 2;
  plane.add(nose);
  const tail = part(new THREE.ConeGeometry(0.75, 2.2, 12), PALETTE.fuselage, 0, 0.15, 3.8);
  tail.rotation.x = Math.PI / 2;
  plane.add(tail);

  // Orange cheatline along the fuselage.
  const stripe = part(new THREE.CylinderGeometry(1.02, 0.78, 1.1, 14), PALETTE.stripe, 0, -0.15, -0.6);
  stripe.rotation.x = Math.PI / 2;
  stripe.scale.set(1, 1, 0.55);
  plane.add(stripe);

  // Canopy: a flattened dark-glass dome.
  const canopy = part(new THREE.SphereGeometry(0.85, 16, 12), PALETTE.canopy, 0, 0.75, -1.4);
  canopy.scale.set(0.9, 0.62, 1.5);
  plane.add(canopy);

  // Main wings with a slight dihedral, plus teal wingtip caps.
  for (const side of [-1, 1]) {
    const wing = part(new THREE.BoxGeometry(5.4, 0.16, 1.9), PALETTE.wing, side * 3.1, 0.05, -0.4);
    wing.rotation.z = side * 0.07;
    plane.add(wing);
    const tip = part(new THREE.BoxGeometry(0.5, 0.18, 1.9), PALETTE.stripe, side * 5.7, 0.22, -0.4);
    tip.rotation.z = side * 0.07;
    plane.add(tip);
  }

  // Tail: horizontal stabiliser and vertical fin.
  const stab = part(new THREE.BoxGeometry(3.6, 0.14, 1.1), PALETTE.wing, 0, 0.25, 4.4);
  plane.add(stab);
  const fin = part(new THREE.BoxGeometry(0.14, 1.7, 1.5), PALETTE.wing, 0, 0.95, 4.5);
  plane.add(fin);
  const finTip = part(new THREE.BoxGeometry(0.16, 0.3, 1.5), PALETTE.stripe, 0, 1.7, 4.5);
  plane.add(finTip);

  // Landing gear: two wheels on struts and a tail wheel.
  for (const side of [-1, 1]) {
    const strut = part(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), PALETTE.propeller, side * 0.9, -0.9, -0.6);
    plane.add(strut);
    const wheel = part(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), PALETTE.propeller, side * 0.9, -1.35, -0.6);
    wheel.rotation.z = Math.PI / 2;
    plane.add(wheel);
  }

  // Propeller: a hub, a spinner cone and two blades, spinning about Z.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -4.35);
  const hub = part(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), PALETTE.propeller, 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const spinner = part(new THREE.ConeGeometry(0.3, 0.8, 10), PALETTE.stripe, 0, 0, -0.5);
  spinner.rotation.x = -Math.PI / 2;
  prop.add(spinner);
  for (const angle of [0, Math.PI]) {
    const blade = part(new THREE.BoxGeometry(0.28, 3.4, 0.1), PALETTE.propeller, 0, 0, 0.1);
    blade.rotation.z = angle;
    prop.add(blade);
  }
  plane.add(prop);

  // A warm navigation light on each wingtip and the tail.
  const navMat = new THREE.MeshBasicMaterial({ color: 0xff4040 });
  const navLeft = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), navMat);
  navLeft.position.set(-5.9, 0.22, -0.4);
  plane.add(navLeft);
  const navRight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40ff70 }));
  navRight.position.set(5.9, 0.22, -0.4);
  plane.add(navRight);

  return {
    group: plane,
    /** Spin the propeller faster with throttle; blur into a disc at cruise. */
    setPropeller(throttle, dt) {
      prop.rotation.z += dt * (4 + throttle * 55);
    },
  };
}

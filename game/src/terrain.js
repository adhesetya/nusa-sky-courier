// The world: a seeded archipelago of five islands in a blue sea, a runway flattened onto the
// main island, a gradient sky dome with a sun, and drifting clouds. heightAt(x, z) is the one
// function the flight model trusts for the ground, so the mesh and the collisions agree.
import * as THREE from 'three';
import { PALETTE, WORLD } from './config.js';
import { createRandom, fbm } from './random.js';

const ISLANDS = [
  { x: 0, z: 0, radius: 720, peak: 150 }, // main island, runway + mountain
  { x: -760, z: -560, radius: 340, peak: 110 },
  { x: 660, z: 620, radius: 300, peak: 95 },
  { x: 780, z: -470, radius: 220, peak: 80 },
  { x: -620, z: 660, radius: 200, peak: 70 },
];

const MOUNTAIN = { x: 190, z: -230, radius: 200, height: 95 };

function islandMask(x, z, island) {
  const dx = x - island.x;
  const dz = z - island.z;
  const d = Math.sqrt(dx * dx + dz * dz) / island.radius;
  if (d >= 1) return 0;
  const edge = 1 - d * d;
  return edge * edge;
}

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function createTerrain(seed) {
  const random = createRandom(seed);

  function heightAt(x, z) {
    let height = -6; // ocean floor
    for (const island of ISLANDS) {
      const mask = islandMask(x, z, island);
      if (mask > 0) {
        const rolling = 26 + fbm(x, z, seed) * 42;
        height = Math.max(height, mask * (rolling + island.peak * 0.55));
      }
    }
    // One proper mountain on the main island.
    const mdx = x - MOUNTAIN.x;
    const mdz = z - MOUNTAIN.z;
    const md = Math.sqrt(mdx * mdx + mdz * mdz) / MOUNTAIN.radius;
    if (md < 1) {
      const bump = (1 - md * md) * MOUNTAIN.height;
      height = Math.max(height, height * 0.35 + bump);
    }
    // Flatten a wide pad for the airfield so the runway sits level and the climb-out
    // is clear: flat within 180 m of the strip, blending back to the hills by 450 m.
    const distPad = Math.sqrt(x * x + z * z);
    const flat = 1 - smoothstep(180, 450, distPad);
    if (flat > 0) height = height * (1 - flat) + WORLD.runwayHeight * flat;
    return height;
  }

  function colourFor(height, x, z) {
    const c = new THREE.Color();
    if (height < 2.5) c.setHex(PALETTE.sand);
    else if (height < 85) {
      c.setHex(PALETTE.grass);
      const dry = fbm(x * 1.7 + 40, z * 1.7, seed + 5) * 0.5 + 0.5;
      c.lerp(new THREE.Color(PALETTE.grassDry), dry * 0.7);
    } else if (height < 140) c.setHex(PALETTE.rock);
    else c.setHex(PALETTE.snow);
    // A little tonal variation so the slopes read.
    const v = 0.92 + fbm(x * 3.1, z * 3.1, seed + 9) * 0.08;
    c.multiplyScalar(v);
    return c;
  }

  const group = new THREE.Group();

  // The ground: a displaced, vertex-coloured heightfield.
  const segments = 180;
  const ground = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segments, segments);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const c = colourFor(h, x, z);
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  ground.computeVertexNormals();
  const groundMesh = new THREE.Mesh(
    ground,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  group.add(groundMesh);

  // The sea: one flat sheet at y = 0, slightly transparent so shallows glow.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size * 2.2, WORLD.size * 2.2),
    new THREE.MeshPhongMaterial({
      color: PALETTE.ocean,
      transparent: true,
      opacity: 0.9,
      shininess: 120,
      specular: 0x99ccdd,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = WORLD.seaLevel;
  group.add(ocean);

  // The runway: asphalt strip, white threshold bars and centre dashes, edge lights.
  const runway = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD.runwayLength, 0.5, WORLD.runwayWidth),
    new THREE.MeshLambertMaterial({ color: PALETTE.runway }),
  );
  strip.position.y = WORLD.runwayHeight;
  runway.add(strip);
  const markMat = new THREE.MeshBasicMaterial({ color: PALETTE.runwayMark });
  for (const end of [-1, 1]) {
    for (let bar = -1; bar <= 1; bar += 1) {
      const threshold = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 3), markMat);
      threshold.position.set(end * (WORLD.runwayLength / 2 - 8), WORLD.runwayHeight + 0.35, bar * 7);
      runway.add(threshold);
    }
  }
  for (let dash = -4; dash <= 4; dash += 1) {
    const centre = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 1.2), markMat);
    centre.position.set(dash * 22, WORLD.runwayHeight + 0.35, 0);
    runway.add(centre);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (let side = -1; side <= 1; side += 2) {
    for (let along = -5; along <= 5; along += 1) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lightMat);
      light.position.set(along * 20, WORLD.runwayHeight + 0.7, side * (WORLD.runwayWidth / 2 + 2));
      runway.add(light);
    }
  }
  group.add(runway);

  // The sky: a gradient dome, a sun disc, and drifting cloud puffs.
  const skyGeo = new THREE.SphereGeometry(4200, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      bottom: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;' +
      'void main(){ float h = clamp(vP.y / 4200.0, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.65)), 1.0); }',
  });
  group.add(new THREE.Mesh(skyGeo, skyMat));

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(90, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
  );
  sun.position.set(1500, 900, -2600);
  sun.lookAt(0, 0, 0);
  group.add(sun);

  // Clouds stay bright white and unlit, so they read as clouds rather than grey rock.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    const puff = new THREE.Group();
    const puffs = 3 + random.int(0, 2);
    for (let p = 0; p < puffs; p += 1) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(random.range(18, 34), 10, 8), cloudMat);
      ball.position.set(random.range(-40, 40), random.range(-6, 8), random.range(-18, 18));
      ball.scale.y = 0.45;
      puff.add(ball);
    }
    puff.position.set(random.range(-1100, 1100), random.range(170, 300), random.range(-1100, 1100));
    clouds.push(puff);
    group.add(puff);
  }

  function update(dt) {
    for (const puff of clouds) {
      puff.position.x += dt * 2.2;
      if (puff.position.x > 1300) puff.position.x = -1300;
    }
  }

  return { group, heightAt, update };
}

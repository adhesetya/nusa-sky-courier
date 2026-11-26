// Every tuning number and colour in one place. World units are metres; sea level is y = 0
// and the runway sits on the main island at y = RUNWAY_HEIGHT. The flight model is arcade:
// throttle sets a target speed, bank turns the plane, pitch trades speed for height.

export const STEP = 1 / 60;

export const WORLD = {
  size: 2400,
  seaLevel: 0,
  runwayHeight: 10,
  runwayLength: 220,
  runwayWidth: 24,
  fogNear: 500,
  fogFar: 2600,
};

export const PLANE = {
  maxSpeed: 85, // m/s at full throttle (~306 km/h)
  stallSpeed: 24, // below this the plane sinks
  accel: 16, // m/s^2 toward the target speed
  maxPitch: 0.55, // rad, about 31 degrees
  maxRoll: 1.05, // rad, about 60 degrees
  turnRate: 0.9, // yaw rad/s at full bank and cruise speed
  sinkRate: 9, // m/s lost when stalled
  climbFactor: 0.9,
};

export const FUEL = {
  capacity: 100,
  drainPerSecond: 0.5, // at full throttle; scaled by throttle
  ringBonus: 5, // small top-up for each gold ring
  fuelRingBonus: 45, // green fuel rings
};

export const RINGS = {
  radius: 16, // pass when within this many metres of the ring centre
  points: 100,
  count: 5,
};

export const LIVES = 3;
export const LANDING_POINTS = 200;
export const TIME_BONUS_MAX = 300; // shrinks as the mission takes longer
export const CRASH_PENALTY = 50;

/** Gold rings in flight order, then the green fuel rings (optional, any time). */
export const RING_PATH = [
  { x: 350, y: 70, z: -80 },
  { x: 600, y: 90, z: -450 },
  { x: -500, y: 100, z: -500 },
  { x: -650, y: 90, z: 300 },
  { x: 400, y: 70, z: 500 },
];

export const FUEL_RINGS = [
  { x: -200, y: 70, z: -250 },
  { x: 150, y: 60, z: 250 },
];

export const START = {
  x: -80,
  y: WORLD.runwayHeight + 1.6,
  z: 0,
  heading: Math.PI / 2, // east, down the runway (+X)
};

export const PALETTE = {
  skyTop: 0x3f7fb8,
  skyHorizon: 0xcfe8f5,
  fog: 0xa8c8de,
  ocean: 0x1e6f9e,
  oceanDeep: 0x155a86,
  sand: 0xd9c07a,
  grass: 0x5d8a4a,
  grassDry: 0x7da05c,
  rock: 0x8a7f74,
  snow: 0xe8ecf0,
  runway: 0x333a42,
  runwayMark: 0xf2f2ee,
  fuselage: 0xf2e6c8,
  wing: 0x1f7a6d,
  stripe: 0xe8641f,
  canopy: 0x1d3a4d,
  propeller: 0x2b2f36,
  ringGold: 0xffc93c,
  ringDone: 0x35d05a,
  ringFuel: 0x2fd47a,
  hud: '#7dffa8',
  hudWarn: '#ffc93c',
  hudDanger: '#ff5d5d',
  panel: 'rgba(10, 22, 32, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'nusa-sky-courier.best';

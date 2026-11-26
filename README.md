# Nusa Sky Courier — Island Mail Run

A 3D flight game for the make.fun bounty **"Make the best flight game"**
(`best-flight-game-20261126-0057`). Fly the island mail plane through all five gold
rings, then land back on the runway. Green rings refuel you — don't run dry over the sea.

## Play

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

No build step, no network requests: every file the game loads lives under `game/`
(Three.js r160 is vendored as `game/vendor/three.module.min.js`).

| Key | Action |
| --- | ------ |
| W / S | Throttle up / down |
| Arrow Up / Down | Pitch (climb / descend) |
| Arrow Left / Right (or A / D) | Bank and turn |
| Mouse (hold + steer) | Steer with the pointer |
| C | Toggle chase / cockpit camera |
| P | Pause |
| Space / click | Start, restart |

## The game

- **World:** a seeded archipelago of five islands in a blue sea — mountains, beaches,
  a runway on the main island, drifting clouds, and a sun. The same seed always
  builds the same islands (`?seed=N`).
- **Flight model:** arcade — throttle sets a target speed, bank turns the plane,
  pitch trades speed for height; below stall speed the plane sinks. Gentle touches
  on the runway land; anything harder, or ditching in the sea, is a crash.
- **Mission:** 5 gold rings in flight order (+100 each), 2 green fuel rings (+45 fuel),
  then land on the runway for +200 and a time bonus. 3 lives; a crash costs one
  and sends you back to the runway with your rings kept.
- **HUD:** altitude, speed, heading with compass letter, vertical speed, fuel and
  throttle bars, score, rings, best score — all lit.
- **Sound:** synthesised WebAudio only (engine hum, ring chime, landing thud, crash) —
  no audio files.

## Screenshots

`?shot=start|play|end` (with `&seed=N`) stages a fixed scene from the real rules,
driven by an autopilot, for reproducible screenshots. `shots.json` maps them to
`screenshots/1-cover.jpg`, `2-start.jpg`, `3-end.jpg`.

## Entry

`main.ts` (Node 22+) copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored `vendor/makefun-game.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — page, import map, HUD and panels
- `game/src/config.js` — tuning numbers and palette
- `game/src/random.js` — seeded RNG and value noise
- `game/src/terrain.js` — islands, sea, sky, runway, clouds
- `game/src/aircraft.js` — the mail plane, built from primitives
- `game/src/rings.js` — gold and fuel rings
- `game/src/flight.js` — the flight model, landings and crashes
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised sound
- `game/src/hud.js` — the HUD and panels
- `game/src/shots.js` — screenshot staging and the autopilot
- `game/src/main.js` — boot, loop, cameras and screens
- `game/vendor/three.module.min.js` — Three.js r160 (MIT), vendored

## License

MIT — see `LICENSE`.

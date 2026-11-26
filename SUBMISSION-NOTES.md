# Submission notes — best-flight-game-20261126-0057

## Entry

- **Repo:** https://github.com/adhesetya/nusa-sky-courier (public, created 2026-11-26, after the competition opened 2026-11-26T00:57:00Z)
- **Commit SHA:** f5f3f3761b75baa418aa409b6ed7e7f73eb72407
- **Branch:** master
- **Bounty:** "Make the best flight game" (`best-flight-game-20261126-0057`), $500 pot, top 50 share, deadline 2026-11-28T00:57:00Z
- **GitHub owner:** adhesetya — the same login linked to the make.fun account @kucing-hideng, so no `.makefun/owner.json` is needed.

## The game — Nusa Sky Courier: Island Mail Run

A real 3D flight game (Three.js r160, vendored minified under `game/vendor/`), all
original art/code/sound, no network requests:

- **World:** seeded archipelago of 5 islands (mountains, beaches, ocean), gradient sky
  dome, sun, drifting clouds, a lit runway on the main island.
- **Aircraft:** single-engine mail plane built from Three.js primitives (cream/teal/
  orange, spinning propeller, nav lights).
- **Gameplay:** throttle (W/S), pitch (arrows), bank/turn (arrows or A/D), mouse steering
  (hold + steer), cockpit-view toggle (C), pause (P). 5 gold rings in order (+100 each),
  2 green fuel rings (+45 fuel), fuel drains with throttle, 3 lives, crash on terrain
  or ditching, gentle runway landings refuel; landing with all 5 rings completes the
  mission (+200 + time bonus). HUD: altitude, speed, heading + compass, vertical speed,
  fuel/throttle bars, score, rings, best. Synthesised WebAudio (engine hum, ring chime,
  landing thud, crash) — no audio files.
- **Source split by job:** `game/src/` — config, random, terrain, aircraft, rings,
  flight, input, audio, hud, shots, main (each named for what it does).

## Screenshots (real renders, never edited)

Taken in headless Chromium (Playwright, SwiftShader WebGL) against `node serve.ts`,
waiting for `window.__shotReady`, 1280x720 JPEG q80. Staged by `?shot=` modes that
play the real rules forward with an autopilot (deterministic, `seed=1`):

| File | Shot | State verified in `__shotState` | Size |
| --- | --- | --- | --- |
| `screenshots/1-cover.jpg` | `?shot=play` | play, score 200, rings 2/5, flying 229 km/h, ALT 96 m | 47,984 B |
| `screenshots/2-start.jpg` | `?shot=start` | title, plane on runway | 75,782 B |
| `screenshots/3-end.jpg` | `?shot=end` | win, score 903, rings 5/5, landed, mission 98 s | 58,926 B |

All ≤256 KiB, long side 1280, short side 720. The autopilot's full mission was
verified end-to-end (trace): all 5 rings by ~80 s, landed ~90 s, score 903, 3 lives kept.

## Verification performed

- **No console errors, no failed requests, no external requests** in any of the three
  shot loads (Playwright console/request listeners; the only 404 seen early on was
  the favicon, fixed with a `data:` icon link).
- **Own source has no external URLs:** `game/src/*.js` + `game/index.html` contain no
  `http` strings at all; only the vendored Three.js library carries inert URL strings
  in its code (never fetched — confirmed by the zero-external-request check).
- **Dossier builds:** `MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0; `out/dossier.json`
  (307,194 B, keys cover/images/schema/text), `out/game` + `out/screenshots` copied.
- **Gate limits:** `game/` = 731,038 B (≤48 MiB), 16 files+dirs (≤993),
  `index.html` = 5,980 B (≤1 MiB), 3 screenshots (≤4, each ≤256 KiB).
- **Kit files kept unchanged:** `vendor/makefun-game.ts` sha256 matches the kit
  (`dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`);
  `main.ts`, `serve.ts`, `LICENSE` copied from the starter as-is.

## NOT done (parent agent's job)

- No `bundle` / `check` / `submit` run; no entry submitted to make.fun.
- `~/workspace/makefun/makefun-keypair.json` and `~/.makefun/credentials` untouched.
- The starter's Block Dodger screenshots were NOT reused; all three screenshots are
  fresh renders of this game.

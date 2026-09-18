# ERINNERUNG

A playable version of the Moderat "Reminder" music video (SEHSUCHT Berlin / Pfadfinderei, dir. Mate Steinforth), built in the browser with Three.js.

Harvest crystals from the grey wasteland, carry them to the shrine, survive the drones, earn the mask, and empty the sky.

## Run

```
npm install
npm run dev
```

## Music

The soundtrack is generated live with [Strudel](https://strudel.cc) from the pattern in `src/score.js`: a pad, a sub pulse and sparse crystal notes while you harvest, a muffled broken kick from the first offering that opens up (with hats) as the mask approaches, then four on the floor once the mask is taken, under a pumping wall of saws that opens over sixteen bars, with vowel chops, risers and booms, arranged as a 32 bar form (groove, lift, breakdown, build, peak) that starts when you take the mask, and the pad alone when the sky is empty. It is all synths, so nothing is fetched at runtime, and the film grain breathes with it.

To work on the last act, open `/?skip=mask`: the run starts with the mask already taken. With the dev server running, saving `src/score.js` swaps the music in place without a reload.

Set `music: 'file'` in `src/config.js` to loop `public/audio/soundtrack.mp3` instead. The game does not depend on either.

Strudel is AGPL-3.0-or-later, so a hosted build that includes it has to offer its source under compatible terms.

## Controls

- WASD / arrows: move. Shift: run. Mouse: look.
- Walk over crystals to pick them up (carry limit in `src/config.js`).
- Walk onto the altar at the shrine to offer what you carry.
- After enough offerings, the mask appears at the altar. Press E to take it.
- With the mask, click to strike down drones in front of you. The deity will not like it.

Drones approach, then hang for a beat with a flickering eye while they lock your position, then strike in a straight line through that point. Sprint sideways during the hang and they miss. Lock range, hang time and strike speed are constants at the top of `src/drones.js`.

## Tuning

Everything worth tweaking lives in `src/config.js`: carry limit, drone count, when the mask appears, and `dronePressure`, which sets how much of the swarm may hunt you before and as you approach the mask. Taking the mask releases all of them. Struck drones are gone for good, and the run ends when none are left.

## Layout

- `src/main.js` game loop and rules
- `src/world.js` terrain, crystals, shrine, sentinels, deity
- `src/player.js` first-person controller
- `src/drones.js` swarm behaviour
- `src/audio.js` score or file playback, and energy analysis
- `src/score.js` the Strudel pattern, by phase of the run
- `src/post.js` grain, vignette, contrast
- `src/hud.js` on-screen text

## Hosting

```
npm run build
```

The build is a static bundle with a relative base, so `dist/` drops onto any
static host as-is, at a domain root or under a subpath.

The track is never part of the build. Hosted runs use the silent timer.

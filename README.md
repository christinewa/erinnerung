# REMINDER

A playable version of the Moderat "Reminder" music video (SEHSUCHT Berlin / Pfadfinderei, dir. Mate Steinforth), built in the browser with Three.js.

Harvest crystals from the grey wasteland, carry them to the shrine, survive the drones, earn the mask, and empty the sky.

## Run

```
npm install
npm run dev
```

Optionally drop a track into `public/audio/reminder.mp3`. It loops in the background and the film grain breathes with it. The game does not depend on it.

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
- `src/audio.js` optional background track and energy analysis
- `src/post.js` grain, vignette, contrast
- `src/hud.js` on-screen text

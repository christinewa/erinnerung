export const CONFIG = {
  // 'score' is the generative Strudel soundtrack (src/score.js), which follows the run. 'file' loops songSrc instead.
  music: 'score',
  // Optional. If a file is here it loops in the background and the grain breathes with it. Not required.
  songSrc: `${import.meta.env.BASE_URL}audio/soundtrack.mp3`,

  worldRadius: 240,
  terrainSize: 620,
  terrainSegments: 200,

  crystalCount: 48,
  carryLimit: 5,
  crystalRespawn: 35,             // seconds before a harvested crystal regrows elsewhere
  maskThreshold: 12,              // crystals offered before the mask appears at the altar

  droneCount: 9,
  droneHitDrops: 2,               // crystals lost per drone hit
  // Fraction of the swarm allowed to hunt you: starts at `min`, reaches `max` as offerings approach the mask.
  dronePressure: { min: 0.15, max: 0.6 },

  shrine: { x: 0, z: -150 },
  spawn: { x: 0, z: 130 },
};

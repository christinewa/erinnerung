import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createTerrain, createCrystals, createShrine, placeCrystal, takeCrystal, terrainHeight, RED, GREEN } from './world.js';
import { Player } from './player.js';
import { Drones } from './drones.js';
import { Song, Score } from './audio.js';
import { createPost } from './post.js';
import { HUD } from './hud.js';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, depth: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const SKY = 0x9c9c9c;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 25, 240);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 600);

const hemi = new THREE.HemisphereLight(0xd0d0d0, 0x3a3a3a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.bias = -0.0015;
scene.add(sun, sun.target);

// ---------- world ----------
createTerrain(scene);
const crystals = createCrystals(scene);
const shrine = createShrine(scene);
const drones = new Drones(scene);
const player = new Player(camera, renderer.domElement);
const song = CONFIG.music === 'score' ? new Score() : new Song();
const post = createPost(renderer, scene, camera);
const hud = new HUD();

const state = {
  carried: 0, delivered: 0, hasMask: false, maskSpawned: false,
  over: false, hits: 0, dodges: 0, kills: 0, started: false, elapsed: 0,
};

// ---------- start / end ----------
// ?skip=mask starts the run with the mask already taken, for working on the last act
const SKIP = new URLSearchParams(location.search).get('skip');
function refreshSongStatus() {
  if (song.missing) hud.setSongStatus('');
  else if (song.ready) hud.setSongStatus('track loaded', 'green');
  else hud.setSongStatus('loading track…');
}
setInterval(refreshSongStatus, 300);

hud.screen.addEventListener('click', async () => {
  if (state.over) { location.reload(); return; }
  if (!state.started) {
    state.started = true;
    await song.start();
    hud.hideScreen();
    if (SKIP === 'mask') takeMask();
  }
  player.lock();
});
renderer.domElement.addEventListener('click', () => { if (state.started && !player.locked) player.lock(); });

function endRun() {
  state.over = true;
  player.controls.unlock();
  for (const e of shrine.eyes) e.visible = false;
  shrine.light.intensity = 0;
  const t = Math.floor(state.elapsed);
  const lines = [
    `<div>THE SKY IS EMPTY</div>`,
    `<div class="dim">OFFERED ${state.delivered} · HIT ${state.hits} TIMES · DODGED ${state.dodges}</div>`,
    `<div class="dim">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</div>`,
    `<div style="margin-top:18px">CLICK TO PLAY AGAIN</div>`,
  ];
  hud.showOutro(lines.join(''));
}

// ---------- input: strike ----------
const fwd = new THREE.Vector3();
addEventListener('mousedown', (e) => {
  if (!player.locked || state.over || e.button !== 0) return;
  if (!state.hasMask) return;
  player.forward(fwd);
  const n = drones.blast(player.position, fwd);
  state.kills += n;
  hud.flashWhite(n ? 0.6 : 0.15);
  if (n) hud.say(n === 1 ? 'one falls' : `${n} fall`, 1.2);
});
addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && state.maskSpawned && !state.hasMask && !state.over) {
    if (player.position.distanceTo(shrine.altarWorld) < 6) takeMask();
  }
});

function takeMask() {
  state.hasMask = true;
  shrine.maskItem.visible = false;
  hud.setTint(true);
  hud.flashWhite(1);
  hud.say('The mask is yours. They know.', 4);
  for (const e of shrine.eyes) e.material = RED;
  shrine.light.color.set(0xff2a2a);
  for (const s of shrine.sentinels) s.children[2].material = RED;
}

// ---------- helpers ----------
function dropCrystals(n) {
  let dropped = 0;
  for (const c of crystals) {
    if (dropped >= n || state.carried <= 0) break;
    if (c.active) continue;
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
    placeCrystal(c, { x: player.position.x + Math.cos(a) * r, z: player.position.z + Math.sin(a) * r });
    c.noPickupUntil = now + 1.5;
    state.carried--; dropped++;
  }
  return dropped;
}

function onDroneHit() {
  state.hits++;
  hud.flashWhite(0.9);
  const lost = dropCrystals(CONFIG.droneHitDrops);
  hud.say(lost ? `struck · ${lost} lost` : 'struck', 1.6);
  camera.position.y -= 0.35;
}

// handy for poking at things from the devtools console
window.reminder = { state, player, song, drones, crystals, shrine, CONFIG, takeMask: () => takeMask(), step: (dt) => step(dt) };

function onDroneMiss() {
  state.dodges++;
  hud.say('dodged', 0.9);
}

// ---------- loop ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();

let now = 0;
function frame() {
  requestAnimationFrame(frame);
  step(Math.min(clock.getDelta(), 0.05));
}
function step(dt) {
  now += dt;
  song.update(dt);
  song.follow({ progress: Math.min(1, state.delivered / CONFIG.maskThreshold), mask: state.hasMask, over: state.over });

  if (state.started && !state.over) {
    if (player.locked) player.update(dt);

    state.elapsed += dt;
    // pressure grows with what you have offered; the mask releases everything
    const { min, max } = CONFIG.dronePressure;
    const progress = Math.min(1, state.delivered / CONFIG.maskThreshold);
    const allowed = state.hasMask ? 1.0 : THREE.MathUtils.lerp(min, max, progress);
    drones.update(dt, player.position, song.energy, allowed, onDroneHit, onDroneMiss);

    // crystals: pickup, regrow, idle animation
    for (const c of crystals) {
      if (c.active) {
        c.group.rotation.y += dt * 0.25;
        c.group.position.y = terrainHeight(c.group.position.x, c.group.position.z) - 0.3 + Math.sin(now * 1.3 + c.phase) * 0.08;
        if (state.carried < CONFIG.carryLimit && !(c.noPickupUntil > now)) {
          tmp.copy(c.group.position); tmp.y += 1.2;
          if (tmp.distanceTo(player.position) < 2.6) {
            takeCrystal(c, now);
            state.carried++;
            hud.flashWhite(0.25);
            if (state.carried === CONFIG.carryLimit) hud.say('full · bring them to the shrine', 2.5);
          }
        }
      } else if (c.respawnAt && now >= c.respawnAt) {
        c.respawnAt = 0; placeCrystal(c);
      }
    }

    // delivery at the altar
    if (state.carried > 0 && player.position.distanceTo(shrine.altarWorld) < 5.5) {
      state.delivered += state.carried;
      hud.say(`offered ${state.carried}`, 2);
      state.carried = 0;
      hud.flashWhite(0.5);
      shrine.light.intensity = 260;
      if (!state.maskSpawned && state.delivered >= CONFIG.maskThreshold) {
        state.maskSpawned = true;
        shrine.maskItem.visible = true;
        hud.say('Something is offered back.', 4);
      }
    }
    shrine.light.intensity = THREE.MathUtils.damp(shrine.light.intensity, 60, 3, dt);

    if (state.hasMask && drones.list.every((d) => d.state === 'gone')) endRun();
  }

  // shrine life
  shrine.deity.position.y = 25 + Math.sin(now * 0.7) * 0.9;
  shrine.deity.rotation.y = Math.sin(now * 0.3) * 0.25;
  shrine.deity.scale.setScalar(1 + song.energy * 0.08);
  for (const s of shrine.sentinels) {
    s.getWorldPosition(tmp);
    s.lookAt(player.position.x, tmp.y, player.position.z);
  }
  if (shrine.maskItem.visible) { shrine.maskItem.rotation.y += dt * 1.5; shrine.maskItem.position.y = 3.6 + Math.sin(now * 2) * 0.2; }

  // sun follows the player so shadows stay sharp nearby
  sun.position.set(player.position.x + 70, player.position.y + 110, player.position.z + 40);
  sun.target.position.copy(player.position);

  // grain breathes with the music
  post.noise.blendMode.opacity.value = 0.22 + song.energy * 0.3;
  post.vignette.darkness = 0.55 + song.energy * 0.3;

  let hint = '';
  if (!player.locked && state.started && !state.over) hint = 'click to resume';
  else if (state.maskSpawned && !state.hasMask) hint = player.position.distanceTo(shrine.altarWorld) < 6 ? 'E · take the mask' : 'the mask waits at the altar';
  else if (state.hasMask) hint = `click to strike · ${drones.alive} drones`;
  else if (state.carried === 0) hint = 'find crystals';

  hud.update(dt, {
    carried: state.carried, limit: CONFIG.carryLimit, delivered: state.delivered,
    time: state.elapsed, hint,
  });

  post.composer.render(dt);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.composer.setSize(innerWidth, innerHeight);
});

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { fbm } from './noise.js';

const { shrine, spawn } = CONFIG;

// ---------- terrain ----------
function rawHeight(x, z) {
  const broad = (fbm(x * 0.006 + 37, z * 0.006 + 91, 4) - 0.5) * 64;
  const mid = (fbm(x * 0.03 + 11, z * 0.03 + 3, 3) - 0.5) * 9;
  const ridge = (1 - Math.abs(fbm(x * 0.02 + 5, z * 0.02 + 9, 3) - 0.5) * 2) * 5;
  const detail = (fbm(x * 0.12, z * 0.12, 2) - 0.5) * 1.8;
  return broad + mid + ridge + detail;
}
const shrineH = rawHeight(shrine.x, shrine.z);
const spawnH = rawHeight(spawn.x, spawn.z);
function ring(x, z, cx, cz, r0, r1) {
  return THREE.MathUtils.smoothstep(Math.hypot(x - cx, z - cz), r0, r1);
}
export function terrainHeight(x, z) {
  let h = rawHeight(x, z);
  h = THREE.MathUtils.lerp(shrineH, h, ring(x, z, shrine.x, shrine.z, 28, 70));
  h = THREE.MathUtils.lerp(spawnH, h, ring(x, z, spawn.x, spawn.z, 8, 34));
  return h;
}
export const shrineHeight = shrineH;

export const DARK = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92, flatShading: true });
export const GREEN = new THREE.MeshBasicMaterial({ color: 0x3aff6a });
export const RED = new THREE.MeshBasicMaterial({ color: 0xff2a2a });

export function createTerrain(scene) {
  const { terrainSize: size, terrainSegments: seg } = CONFIG;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8e8e8e, roughness: 1, metalness: 0, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // distant monoliths for scale
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 110 + Math.random() * 150;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - shrine.x, z - shrine.z) < 60) continue;
    const h = 18 + Math.random() * 70;
    const w = 2 + Math.random() * 5;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), DARK);
    m.position.set(x, terrainHeight(x, z) + h / 2 - 2, z);
    m.rotation.y = Math.random() * Math.PI;
    m.castShadow = true;
    scene.add(m);
  }
  return mesh;
}

// ---------- crystals ----------
const crystalGeo = new THREE.OctahedronGeometry(1, 0);
const crystalMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.25, flatShading: true,
});

export function createCrystals(scene) {
  const crystals = [];
  for (let i = 0; i < CONFIG.crystalCount; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(crystalGeo, crystalMat);
      const s = 0.45 + Math.random() * 0.7;
      m.scale.set(s, s * 2.3, s);
      m.position.set((Math.random() - 0.5) * 1.6, s * 1.1, (Math.random() - 0.5) * 1.6);
      m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
      m.castShadow = true;
      g.add(m);
    }
    scene.add(g);
    const c = { group: g, active: false, respawnAt: 0, phase: Math.random() * Math.PI * 2 };
    placeCrystal(c);
    crystals.push(c);
  }
  return crystals;
}

export function placeCrystal(c, at) {
  let x, z;
  if (at) { x = at.x; z = at.z; }
  else {
    for (let tries = 0; tries < 50; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (CONFIG.worldRadius - 15);
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      if (Math.hypot(x - shrine.x, z - shrine.z) > 45 && Math.hypot(x - spawn.x, z - spawn.z) > 14) break;
    }
  }
  c.group.position.set(x, terrainHeight(x, z) - 0.3, z);
  c.group.visible = true;
  c.active = true;
}

export function takeCrystal(c, now) {
  c.active = false;
  c.group.visible = false;
  c.respawnAt = now + CONFIG.crystalRespawn;
}

// ---------- shrine ----------
function createFigure() {
  const f = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.6, 2, 6), DARK);
  body.position.y = 1.3; body.castShadow = true; f.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), DARK);
  head.position.y = 2.75; f.add(head);
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), GREEN);
  mask.position.set(0, 2.75, 0.27); f.add(mask);
  return f;
}

export function createShrine(scene) {
  const g = new THREE.Group();
  g.position.set(shrine.x, shrineH, shrine.z);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(24, 27, 1.6, 12), DARK);
  platform.position.y = 0.5; platform.receiveShadow = true; g.add(platform);

  const monolith = new THREE.Mesh(new THREE.BoxGeometry(5, 36, 5), DARK);
  monolith.position.set(0, 18, -9); monolith.castShadow = true; g.add(monolith);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const h = 10 + Math.random() * 9;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.6), DARK);
    p.position.set(Math.cos(a) * 21, h / 2, Math.sin(a) * 21);
    p.castShadow = true; g.add(p);
  }

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 1.2, 8), DARK);
  altar.position.set(0, 1.9, 11); g.add(altar);

  // the deity: a floating mask
  const deity = new THREE.Group();
  const face = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 1.2), DARK);
  deity.add(face);
  const eyes = [];
  for (const sx of [-1.7, 1.7]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.3), GREEN);
    e.position.set(sx, 1.2, 0.7); deity.add(e); eyes.push(e);
  }
  deity.position.set(0, 25, -4);
  g.add(deity);

  const sentinels = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const s = createFigure();
    s.position.set(Math.cos(a) * 14, 1.3, Math.sin(a) * 14);
    g.add(s); sentinels.push(s);
  }

  // the mask you can take, hidden until earned
  const maskItem = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.15), DARK);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), GREEN);
  glow.position.z = 0.09;
  maskItem.add(plate, glow);
  maskItem.position.set(0, 3.6, 11);
  maskItem.visible = false;
  g.add(maskItem);

  const light = new THREE.PointLight(0x3aff6a, 60, 70, 1.6);
  light.position.set(0, 20, -4); g.add(light);

  scene.add(g);
  return {
    group: g, deity, eyes, sentinels, maskItem, light,
    altarWorld: new THREE.Vector3(shrine.x, shrineH + 1.9, shrine.z + 11),
  };
}

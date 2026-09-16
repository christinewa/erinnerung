import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { terrainHeight } from './world.js';
import { CONFIG } from './config.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = {};
    this.velocity = new THREE.Vector3();
    this.eye = 1.7;
    this.bob = 0;
    this.moving = 0;
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();

    const { spawn, shrine } = CONFIG;
    camera.position.set(spawn.x, terrainHeight(spawn.x, spawn.z) + this.eye, spawn.z);
    camera.lookAt(shrine.x, camera.position.y, shrine.z);

    addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  }

  get position() { return this.camera.position; }
  get locked() { return this.controls.isLocked; }
  lock() { this.controls.lock(); }

  forward(out) {
    this.camera.getWorldDirection(out);
    return out;
  }

  update(dt) {
    const k = this.keys;
    const speed = (k.ShiftLeft || k.ShiftRight) ? 14 : 8.5;
    const ix = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    const iz = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);

    this.camera.getWorldDirection(this._fwd);
    this._fwd.y = 0; this._fwd.normalize();
    this._right.crossVectors(this._fwd, UP);
    this._wish.set(0, 0, 0).addScaledVector(this._fwd, iz).addScaledVector(this._right, ix);
    if (this._wish.lengthSq() > 0) this._wish.normalize().multiplyScalar(speed);

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, this._wish.x, 9, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, this._wish.z, 9, dt);

    const p = this.camera.position;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    const r = Math.hypot(p.x, p.z);
    if (r > CONFIG.worldRadius) { p.x *= CONFIG.worldRadius / r; p.z *= CONFIG.worldRadius / r; }

    this.moving = this.velocity.length();
    this.bob += dt * this.moving * 1.3;
    const bobAmt = Math.sin(this.bob) * 0.06 * Math.min(1, this.moving / 8);
    const targetY = terrainHeight(p.x, p.z) + this.eye + bobAmt;
    p.y = THREE.MathUtils.damp(p.y, targetY, 14, dt);
  }
}

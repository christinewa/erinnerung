import * as THREE from 'three';
import { CONFIG } from './config.js';
import { terrainHeight, DARK, RED } from './world.js';

const tmp = new THREE.Vector3();

const LOCK_RANGE = 22;     // units from the player at which a diving drone locks on
const LOCK_TIME = 0.45;    // seconds it hangs before striking (your window to move)
const STRIKE_SPEED = 60;   // units per second along the committed line
const HIT_RADIUS = 2.4;

export class Drones {
  constructor(scene) {
    this.list = [];
    this.center = new THREE.Vector3(CONFIG.shrine.x, 0, CONFIG.shrine.z);
    this.baseY = terrainHeight(this.center.x, this.center.z);
    for (let i = 0; i < CONFIG.droneCount; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.TetrahedronGeometry(0.9), DARK);
      const armA = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.26), DARK);
      const armB = armA.clone(); armB.rotation.y = Math.PI / 2;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.14), RED);
      eye.position.z = 0.65;
      core.castShadow = true;
      g.add(core, armA, armB, eye);
      scene.add(g);
      const d = {
        mesh: g, eye, state: 'orbit',
        target: new THREE.Vector3(), dir: new THREE.Vector3(),
        lockT: 0, strikeT: 0,
        angle: (i / CONFIG.droneCount) * Math.PI * 2,
        radius: 40 + Math.random() * 35,
        alt: 24 + Math.random() * 16,
        speed: 0.22 + Math.random() * 0.2,
        cooldown: 2 + Math.random() * 6,
        diveTime: 0, dead: 0, spin: 0,
      };
      g.position.set(this.center.x + Math.cos(d.angle) * d.radius, this.baseY + d.alt, this.center.z + Math.sin(d.angle) * d.radius);
      this.list.push(d);
    }
  }

  update(dt, playerPos, energy, allowedFraction, onHit, onMiss) {
    const allowed = Math.round(allowedFraction * this.list.length);
    let hunting = this.list.filter((d) => d.state === 'dive' || d.state === 'lock' || d.state === 'strike').length;

    for (const d of this.list) {
      const m = d.mesh;
      if (d.state === 'dead') {
        m.position.y -= dt * 22;
        m.rotation.x += dt * 7;
        m.rotation.z += dt * 4;
        const ground = terrainHeight(m.position.x, m.position.z) - 0.5;
        if (m.position.y <= ground) { d.state = 'gone'; m.visible = false; }
        continue;
      }
      if (d.state === 'gone') continue;

      if (d.state === 'orbit') {
        d.angle += dt * d.speed * (0.7 + energy);
        tmp.set(
          this.center.x + Math.cos(d.angle) * d.radius,
          this.baseY + d.alt + Math.sin(d.angle * 3) * 4,
          this.center.z + Math.sin(d.angle) * d.radius,
        );
        m.position.lerp(tmp, 1 - Math.exp(-dt * 2));
        m.lookAt(this.center.x, this.baseY + 22, this.center.z);
        d.cooldown -= dt;
        if (d.cooldown <= 0 && hunting < allowed && Math.random() < dt * 0.7) {
          d.state = 'dive'; d.diveTime = 0; hunting++;
        }
      } else if (d.state === 'dive') {
        // approach: home in on the player until close enough to lock
        d.diveTime += dt;
        const speed = 20 + energy * 20;
        tmp.subVectors(playerPos, m.position);
        const dist = tmp.length();
        tmp.normalize();
        m.position.addScaledVector(tmp, speed * dt);
        const minY = terrainHeight(m.position.x, m.position.z) + 1.4;
        if (m.position.y < minY) m.position.y = minY;
        m.lookAt(playerPos);
        d.spin += dt * 9;
        m.rotateZ(d.spin);
        if (dist < LOCK_RANGE) {
          d.state = 'lock'; d.lockT = 0;
          d.target.copy(playerPos);
        } else if (d.diveTime > 10) {
          d.state = 'orbit'; d.cooldown = 4 + Math.random() * 5;
        }
      } else if (d.state === 'lock') {
        // the tell: hang in the air, eye flickering, aimed at where you were
        d.lockT += dt;
        m.position.y += dt * 1.5;
        m.lookAt(d.target);
        d.eye.visible = Math.floor(d.lockT * 24) % 2 === 0;
        if (d.lockT >= LOCK_TIME) {
          d.eye.visible = true;
          d.state = 'strike'; d.strikeT = 0;
          d.dir.subVectors(d.target, m.position).normalize();
        }
      } else if (d.state === 'strike') {
        // committed: a straight line through the locked point, no more tracking
        d.strikeT += dt;
        m.position.addScaledVector(d.dir, STRIKE_SPEED * dt);
        const minY = terrainHeight(m.position.x, m.position.z) + 1.0;
        if (m.position.y < minY) m.position.y = minY;
        d.spin += dt * 16;
        m.rotateZ(dt * 16);
        const dist = m.position.distanceTo(playerPos);
        const passed = tmp.subVectors(d.target, m.position).dot(d.dir) < 0;
        if (dist < HIT_RADIUS) {
          onHit(d);
          d.state = 'orbit'; d.cooldown = 9 + Math.random() * 8;
        } else if ((passed && d.strikeT > 0.5) || d.strikeT > 1.6) {
          if (onMiss) onMiss(d);
          d.state = 'orbit'; d.cooldown = 5 + Math.random() * 5;
        }
      }
    }
  }

  // strike every drone within a cone in front of the player; returns how many fell
  blast(playerPos, forward) {
    let n = 0;
    for (const d of this.list) {
      if (d.state === 'dead' || d.state === 'gone') continue;
      tmp.subVectors(d.mesh.position, playerPos);
      const dist = tmp.length();
      if (dist > 45) continue;
      tmp.normalize();
      if (tmp.dot(forward) > 0.82) { d.state = 'dead'; d.eye.visible = false; n++; }
    }
    return n;
  }

  get alive() { return this.list.filter((d) => d.state !== 'dead' && d.state !== 'gone').length; }
}

import * as THREE from 'three';
import { CONFIG } from './config.js';

// Optional background track. Exposes a smoothed low-frequency "energy" (0..1) that the grain
// and drone speed breathe with. Without a file, energy just idles on a slow pulse.
export class Song {
  constructor(src = CONFIG.songSrc) {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.loop = true;
    this.ready = false;
    this.missing = false;
    this.started = false;
    this.energy = 0.4;
    this.energyRaw = 0.4;
    this.t = 0;
    this._floor = 0.2; this._peak = 0.6;

    this.audio.addEventListener('canplaythrough', () => { this.ready = true; }, { once: true });
    this.audio.addEventListener('error', () => { this.missing = true; });
    this.probe(src);
  }

  // Dev servers answer missing files with the HTML page, so check the content type before trusting the URL.
  async probe(src) {
    try {
      const r = await fetch(src, { method: 'HEAD' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('audio/')) { this.missing = true; return; }
      this.audio.src = src;
    } catch { this.missing = true; }
  }

  async start() {
    this.started = true;
    if (this.missing) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const node = this.ctx.createMediaElementSource(this.audio);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.55;
      node.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);
      await this.ctx.resume();
      await this.audio.play();
    } catch (err) {
      console.warn('[song] audio unavailable', err);
      this.missing = true;
    }
  }

  update(dt) {
    if (!this.started) return;
    this.t += dt;
    if (this.missing || !this.analyser) {
      this.energyRaw = 0.4 + 0.15 * Math.sin(this.t * 0.4);
    } else {
      this.analyser.getByteFrequencyData(this.bins);
      let sum = 0;
      const n = 10; // ~0-900 Hz at 44.1k / fftSize 512
      for (let i = 1; i <= n; i++) sum += this.bins[i];
      const raw = sum / (n * 255);
      this._peak = Math.max(raw, this._peak - dt * 0.02);
      this._floor = Math.min(raw, this._floor + dt * 0.02);
      const span = Math.max(0.05, this._peak - this._floor);
      this.energyRaw = THREE.MathUtils.clamp((raw - this._floor) / span, 0, 1);
    }
    this.energy = THREE.MathUtils.damp(this.energy, this.energyRaw, 7, dt);
  }
}

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { score } from './score.js';

// Editing score.js while the dev server runs swaps the music in place, no reload.
let compose = score;
if (import.meta.hot) import.meta.hot.accept('./score.js', (m) => { if (m) compose = m.score; });

// Exposes a smoothed low-frequency "energy" (0..1) that the grain and drone speed breathe with.
// Without an analyser to listen to, energy just idles on a slow pulse.
class Track {
  constructor() {
    this.ready = false;
    this.missing = false;
    this.started = false;
    this.energy = 0.4;
    this.energyRaw = 0.4;
    this.t = 0;
    this._floor = 0.2; this._peak = 0.6;
  }

  // the file plays the same whatever happens; only the score follows the run
  follow() {}

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

// Optional background track from a file.
export class Song extends Track {
  constructor(src = CONFIG.songSrc) {
    super();
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.loop = true;

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
}

// Generative soundtrack played by Strudel (see score.js). Loaded lazily, it is a big module.
export class Score extends Track {
  constructor() {
    super();
    this.key = '';
    this.strudel = import('@strudel/web').then(async (m) => {
      this.repl = await m.initStrudel();
      this.ready = true;
      return m;
    });
    this.strudel.catch((err) => { console.warn('[score] strudel unavailable', err); this.missing = true; });
  }

  async start() {
    this.started = true;
    try {
      const m = await this.strudel;
      await m.initAudio();
      m.getAudioContext().resume(); // not awaited: without a user gesture this never settles
      this.analyser = m.getAnalyserById(1, 512, 0.55);
      this.analyser.maxDecibels = -10; // the synths run hot down low; leave the bins some headroom
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);
      this.follow(this.cue ?? {});
    } catch (err) {
      console.warn('[score] audio unavailable', err);
      this.missing = true;
    }
  }

  // Called every frame with where the run stands; re-evaluates only when the music should change.
  follow(cue) {
    this.cue = cue;
    if (!this.analyser || this.missing) return;
    // note the bar each act begins on, so its arrangement plays from the top
    const act = `${cue.mask}|${cue.over}`;
    if (act !== this.act) { this.act = act; this.at = Math.ceil(this.repl.scheduler.now()); }
    const code = compose({ ...cue, at: this.at });
    if (code === this.key) return;
    this.key = code;
    this.strudel.then((m) => m.evaluate(code)).catch((err) => console.warn('[score]', err));
  }
}

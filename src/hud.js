const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.carried = $('carried'); this.limit = $('limit'); this.delivered = $('delivered');
    this.clock = $('clock'); this.hint = $('hint');
    this.msg = $('msg'); this.flash = $('flash'); this.tint = $('tint');
    this.screen = $('screen');
    this.intro = $('intro'); this.outro = $('outro'); this.songstatus = $('songstatus');
    this._msgTimer = 0;
    this._flash = 0;
  }
  setSongStatus(text, cls = 'dim') { this.songstatus.textContent = text; this.songstatus.className = cls; }
  hideScreen() { this.screen.classList.add('hidden'); }
  showOutro(html) { this.intro.style.display = 'none'; this.outro.style.display = 'block'; this.outro.innerHTML = html; this.screen.classList.remove('hidden'); }
  say(text, seconds = 2.5) { this.msg.textContent = text; this.msg.classList.add('show'); this._msgTimer = seconds; }
  flashWhite(a = 0.85) { this._flash = a; }
  setTint(on) { this.tint.style.opacity = on ? 1 : 0; }
  update(dt, s) {
    this.carried.textContent = s.carried; this.limit.textContent = s.limit; this.delivered.textContent = s.delivered;
    const t = Math.floor(s.time);
    this.clock.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    this.hint.textContent = s.hint;
    if (this._msgTimer > 0) { this._msgTimer -= dt; if (this._msgTimer <= 0) this.msg.classList.remove('show'); }
    if (this._flash > 0) { this._flash = Math.max(0, this._flash - dt * 2.5); this.flash.style.opacity = this._flash; }
  }
}

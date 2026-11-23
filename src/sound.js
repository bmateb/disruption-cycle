/* Synthesised sound effects (Web Audio, no files). SFX.watch(state) turns game state changes into sounds. */
const SFX = (function () {
  let ctx = null, master = null, prev = null, seen = 0, lastLeft = -1, lastNews = 0;
  const on = () => { try { return localStorage.getItem('dcap-snd') !== '0'; } catch (e) { return true; } };
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    return ctx;
  }
  function tone(f, t0, d, type, g, f2) {
    const c = ac(); if (!c) return; const o = c.createOscillator(), a = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g || 0.25, t + 0.012); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(a); a.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function bell(f, t0, d, g) { [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].forEach(p => tone(f * p[0], t0, d / (p[0] > 3 ? 2 : 1), 'sine', (g || 0.22) * p[1])); }
  const S = {
    open: () => { for (let k = 0; k < 4; k++) bell(740, k * 0.2, 1.4 - k * 0.1, 0.2); },
    close: () => { for (let k = 0; k < 3; k++) bell(494, k * 0.45, 1.8, 0.22); },
    breaking: () => { [0, 0.16, 0.32, 0.48].forEach((t, k) => tone(k % 2 ? 1319 : 988, t, 0.14, 'triangle', 0.28)); tone(660, 0.7, 0.35, 'triangle', 0.2); },
    win: () => { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.09, 0.4, 'sine', 0.24)); },
    fail: () => { tone(330, 0, 0.6, 'sawtooth', 0.16, 90); tone(165, 0.05, 0.6, 'sine', 0.25, 60); },
    buy: () => { tone(660, 0, 0.09, 'sine', 0.2); tone(990, 0.08, 0.14, 'sine', 0.2); },
    sell: () => { tone(990, 0, 0.09, 'sine', 0.2); tone(660, 0.08, 0.14, 'sine', 0.2); },
    err: () => { tone(170, 0, 0.18, 'square', 0.12); },
    tick: () => { tone(1300, 0, 0.05, 'square', 0.1); },
    beep: () => { tone(1760, 0, 0.12, 'square', 0.14); },
    fanfare: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => tone(f, k * 0.16, k === 6 ? 1.2 : 0.3, 'triangle', 0.26)); bell(523, 1.2, 2, 0.12); },
  };
  const log = [];
  function play(n, delay) { if (!on() || !S[n]) return; if (delay) setTimeout(() => play(n), delay); else { log.push(n); if (log.length > 60) log.shift(); if (!ac()) return; S[n](); } }
  function paint() { document.documentElement.setAttribute('data-sound', on() ? 'on' : 'off'); }
  function toggle() { try { localStorage.setItem('dcap-snd', on() ? '0' : '1'); } catch (e) { } paint(); if (on()) { ac(); play('tick'); } }
  function watch(s) {
    if (!s) return; const p = prev; prev = { ph: s.ph, t: s.t, bk: s.bk };
    const ids = (s.news || []).map(n => n.id || 0), top = ids.length ? Math.max.apply(null, ids) : 0;
    if (!p) { seen = top; return; }
    let bellDelay = 0;
    if (p.ph === 'prep' && s.ph === 'run') { play('open'); bellDelay = 1500; }
    else if (p.ph === 'run' && s.ph === 'pause' && s.bk) { play('close'); bellDelay = 1900; }
    else if (p.ph === 'pause' && s.ph === 'run' && p.bk) { play('open'); bellDelay = 1500; }
    else if (p.ph === 'run' && s.ph === 'run' && s.t > p.t) { play('close'); play('open', 1500); bellDelay = 3000; }
    if (s.ph === 'end' && p.ph !== 'end') { play('fanfare'); bellDelay = 2500; }
    const fresh = (s.news || []).filter(n => (n.id || 0) > seen); seen = Math.max(seen, top);
    if (fresh.length && s.ph !== 'prep') {
      const ty = fresh.map(n => n.ty);
      const snd = ty.indexOf('fail') >= 0 ? 'fail' : ty.indexOf('mkt') >= 0 || (s.mj && s.mj.length && s.ph === 'pause') ? 'breaking' : (ty.indexOf('win') >= 0 || ty.indexOf('deal') >= 0) ? 'win' : null;
      if (snd && s.ph !== 'end') play(snd, bellDelay || 0);
    }
    if (s.ph === 'pause' && s.bk) {
      const left = Math.ceil((s.bk - (s.now || Date.now())) / 1000);
      if (left >= 1 && left <= 5 && left !== lastLeft) { play(left <= 3 ? 'beep' : 'tick'); }
      lastLeft = left;
    } else lastLeft = -1;
  }
  document.addEventListener('pointerdown', () => { if (on()) ac(); }, { once: false, passive: true });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-snd]')) toggle(); });
  paint();
  return { play, watch, paint, toggle, on, log };
})();
const SND_BTN = '<button class="sndb" data-snd="1" title="Sound on/off" aria-label="Sound on or off"><span class="son">🔊</span><span class="soff">🔇</span></button>';

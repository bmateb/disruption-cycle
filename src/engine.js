/* Disruption Cycle: Capital Markets. Pure rules engine, runs in the host's browser (authoritative) and in Node tests.
   Everything in G is plain JSON so the host can save/restore it. */
(function (root) {
  'use strict';

  const HP = { // horizon parameters
    1: { name: 'Core', p0: 0.93, beta: 0.12, u: 1.22, r: 0.006, depth: 1.4, burn: 0.0010 },
    2: { name: 'Adjacent', p0: 0.80, beta: 0.35, u: 1.60, r: 0.012, depth: 1.0, burn: 0.0018 },
    3: { name: 'Breakthrough', p0: 0.62, beta: 0.70, u: 2.40, r: 0.020, depth: 0.7, burn: 0.0030 },
  };
  const PROJ = [
    { code: 'ROUT', name: 'RouteWise', h: 1, p: 52, line: 'Route-optimisation software for existing logistics customers' },
    { code: 'LEAN', name: 'Leanline', h: 1, p: 46, line: 'Efficiency programme: cut cost per unit by 15% in the current factory' },
    { code: 'PACK', name: 'PackPlus', h: 1, p: 40, line: 'Smart-packaging upgrade of the legacy product range' },
    { code: 'RELO', name: 'Reload', h: 1, p: 44, line: 'Refurbished-goods marketplace for the installed customer base' },
    { code: 'MESH', name: 'MeshPress', h: 2, p: 31, line: 'New data-compression platform sold to partner firms' },
    { code: 'CLIN', name: 'ClinAI', h: 2, p: 27, line: 'Diagnostic assistant for hospitals, an adjacent market' },
    { code: 'AGRO', name: 'AgroFleet', h: 2, p: 24, line: 'Autonomous drones for farms, a new customer segment' },
    { code: 'PAYL', name: 'Payloop', h: 2, p: 34, line: 'Embedded payments for users of an existing platform' },
    { code: 'VOLT', name: 'Voltcore', h: 3, p: 15, line: 'Solid-state battery, years away from a product' },
    { code: 'LENS', name: 'Neurolens', h: 3, p: 12, line: 'AR glasses built on a new interaction paradigm' },
    { code: 'KILN', name: 'KilnBio', h: 3, p: 18, line: 'Lab-grown materials that could replace a commodity' },
    { code: 'SKYL', name: 'Skyline', h: 3, p: 10, line: 'Low-orbit satellite broadband for remote regions' },
  ];
  const NP = PROJ.length;
  const STAGES = ['Seed', 'Series A', 'Series B', 'Exit-ready'];
  const DEF = {
    T: 14, tickSec: 75, cash0: 100000, fee: 0.005, ddCost: 1500, maxExp: 0.4,
    depthF: 2.0, lam: 0.3, phi: 0.08, sigTr: 0.18, sigDD: 0.10, sigSent: 0.02,
    events: true, anon: false,
  };

  // ------------------------------------------------------------------ utils
  function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rnd(G) { // mulberry32 on G.rs
    G.rs = (G.rs + 0x6D2B79F5) >>> 0; let t = G.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rndS(seed) { let s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function norm(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round = (x, d) => { const f = Math.pow(10, d || 0); return Math.round(x * f) / f; };

  // ------------------------------------------------------------------ model
  function pGate(h, q, psi) { const H = HP[h]; return clamp(H.p0 + H.beta * (q - 0.5), 0.05, 0.97) * (0.85 + 0.15 * psi); }

  function remaining(G, i) { const p = G.pr[i]; return p.gates.length - p.gi; }
  function nextGate(G, i) { const p = G.pr[i]; return p.gi < p.gates.length ? p.gates[p.gi] : null; }

  function need(G, i) { // cash needed to reach next gate
    const p = G.pr[i], ng = nextGate(G, i);
    const ticks = ng == null ? 0 : Math.max(1, ng - G.t);
    return p.burn * ticks;
  }
  function psi(G, i) { const n = need(G, i); return n <= 0 ? 1 : clamp(G.pr[i].cash / n, 0, 1); }

  function evMult(G, i, q, ps) { // product over remaining gates of p*u
    const p = G.pr[i], H = HP[p.h]; let m = 1;
    for (let j = p.gi; j < p.gates.length; j++) m *= pGate(p.h, q, ps) * H.u;
    return m;
  }
  function baseAnchor(G, i, q) {
    const p = G.pr[i], H = HP[p.h];
    const ps = psi(G, i);
    return p.v * evMult(G, i, q, ps) / Math.pow(1 + H.r, G.T - G.t);
  }
  function consensus(G, i) { const p = G.pr[i]; let s = 1.5; for (const o of p.obs) s += o; return s / (3 + p.obs.length); }
  function recomputeAnchor(G, i) {
    const p = G.pr[i];
    if (p.st !== 'live') return;
    const m = G.mac[p.h - 1] * p.sent;
    p.A = baseAnchor(G, i, consensus(G, i)) * m;
    if (G.t >= G.T) p.A = p.v;
    setPrice(G, i);
  }
  function setPrice(G, i) {
    const p = G.pr[i];
    if (p.st === 'live') p.P = p.A * Math.exp(p.z);
    // dead / sold prices are fixed when the state changes
  }

  // ------------------------------------------------------------------ setup
  function newGame(cfg, seed) {
    const c = Object.assign({}, DEF, cfg || {});
    const G = { v: 1, cfg: c, T: c.T, t: 0, ph: 'lobby', rs: hash(String(seed || 'dc')) || 7, pl: {}, ord: [], pr: [], tape: [], news: [], log: [], mac: [1, 1, 1], macT: [1, 1, 1], fc: 1, fcUntil: 0, rum: null, K: 0, seq: 0, hist: [], ev: [] };
    return G;
  }
  function addPlayer(G, id, name, bot) {
    if (G.pl[id]) return G.pl[id];
    const pl = { id, name: String(name || 'Player').slice(0, 18), cash: G.cfg.cash0, hold: new Array(NP).fill(0), cost: new Array(NP).fill(0), dd: {}, ddn: 0, tr: 0, vol: 0, bot: bot || null, last: 0, nwh: [G.cfg.cash0], ack: null, join: G.t, tok: null, seen: [], sq: 0 };
    G.pl[id] = pl; G.ord.push(id);
    return pl;
  }
  function setupMarket(G, nPlayers) {
    const c = G.cfg, T = G.T;
    const nAll = Math.max(nPlayers, 8);
    G.K = nAll * c.cash0;
    G.pr = PROJ.map((d, i) => {
      const H = HP[d.h];
      // gate schedule
      const gates = [];
      for (let k = 1; k <= 3; k++) {
        let g = Math.round(k * (T - 1) / 3 - 0.4 + (rnd(G) * 2 - 1) * 0.9);
        const prev = gates.length ? gates[gates.length - 1] : 1;
        g = clamp(g, prev + 2, T - 1 - (3 - k));
        gates.push(g);
      }
      const q = clamp(0.5 + (rnd(G) * 2 - 1) * 0.38 + (rnd(G) - 0.5) * 0.04, 0.12, 0.92);
      const burn = H.burn * G.K;
      const p = { i, code: d.code, name: d.name, h: d.h, line: d.line, q, gates, gi: 0, stage: 0, v: 1, cash: burn * gates[0] * 0.55, burn, st: 'live', obs: [], sent: 1, z: 0, A: d.p, P: d.p, flow: 0, flowP: 0, vol: 0, D: c.depthF * G.K / NP * H.depth, ph: [d.p], zmax: 0, raised: 0, cls: 0, exitV: null, ups: [], ddseed: (rnd(G) * 1e9) | 0, sf: 0, lg: 0, gl: [] };
      // calibrate v so that the opening anchor equals the listed price
      p.v = 1; const base = baseAnchor({ T: T, t: 0, pr: [p], mac: [1, 1, 1] }, 0, 0.5);
      p.v = d.p / base;
      return p;
    });
    G.pr.forEach((p, i) => { G.pr[i].A = baseAnchor(G, i, 0.5); G.pr[i].P = G.pr[i].A; G.pr[i].ph = [round(G.pr[i].P, 2)]; });
    // event schedule
    G.ev = [];
    if (c.events) {
      const t1 = clamp(Math.round(T * 0.22), 2, T - 3), t2 = clamp(Math.round(T * 0.50), t1 + 2, T - 3), t3 = clamp(Math.round(T * 0.72), t2 + 1, T - 2), tr = clamp(Math.round(T * 0.40), 3, T - 4);
      G.ev = [{ t: t1, k: 'hype' }, { t: tr, k: 'rumour' }, { t: t2, k: 'winter' }, { t: t3, k: 'disrupt' }];
    }
  }
  function start(G) {
    const n = G.ord.filter(id => !G.pl[id].bot).length + G.ord.filter(id => G.pl[id].bot).length;
    setupMarket(G, n);
    G.ph = 'run'; G.t = 0;
    snapshot(G);
    G.news.unshift({ t: 0, x: 'The market opens. Twelve innovation projects are seeking capital: four core, four adjacent, four breakthrough.' });
  }

  // ------------------------------------------------------------------ valuation helpers
  function netWorth(G, pl) { let w = pl.cash; for (let i = 0; i < NP; i++) if (pl.hold[i]) w += pl.hold[i] * G.pr[i].P; return w; }

  // ------------------------------------------------------------------ trading
  function quoteBuy(G, i, S) {
    const p = G.pr[i]; const u = S * p.P / p.D; if (!(S >= 1) || u >= 0.95) return null;
    const x = -p.D * Math.log(1 - u); return { x, z1: p.z + x / p.D };
  }
  function quoteSell(G, i, S) {
    const p = G.pr[i]; if (!(S >= 1)) return null;
    const x = p.D * Math.log(1 + S * p.P / p.D); return { x, z1: p.z - x / p.D };
  }
  function maxBuyShares(G, pl, i) { // largest S the player can afford and that respects depth and exposure
    const p = G.pr[i]; if (p.st !== 'live') return 0;
    let lo = 0, hi = Math.floor(0.94 * p.D / p.P);
    const ok = S => { const r = tryBuy(G, pl, i, S, true); return r.ok; };
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (ok(mid)) lo = mid; else hi = mid - 1; }
    return lo;
  }
  function sharesForCash(G, i, x) { const p = G.pr[i]; return Math.max(0, Math.floor((p.D / p.P) * (1 - Math.exp(-x / p.D)))); }

  function tryBuy(G, pl, i, S, dry) {
    const p = G.pr[i]; S = Math.floor(S);
    if (G.ph !== 'run') return { ok: false, err: G.ph === 'pause' ? 'Market paused' : 'Market closed' };
    if (p.st !== 'live') return { ok: false, err: 'Not tradable' };
    const q = quoteBuy(G, i, S); if (!q) return { ok: false, err: 'Order too large for market depth, split it' };
    const fee = q.x * G.cfg.fee, cost = q.x + fee;
    if (cost > pl.cash + 1e-9) return { ok: false, err: 'Not enough cash' };
    const Pn = p.A * Math.exp(q.z1);
    const posV = (pl.hold[i] + S) * Pn; const nwAfter = (pl.cash - cost) + posV + otherPos(G, pl, i);
    if (posV > G.cfg.maxExp * nwAfter + 1e-6) return { ok: false, err: 'Concentration limit: max ' + Math.round(G.cfg.maxExp * 100) + '% of net worth in one project' };
    if (dry) return { ok: true };
    pl.cash -= cost; pl.hold[i] += S; pl.cost[i] += cost; p.z = q.z1; p.flow += q.x; p.vol += q.x; p.zmax = Math.max(p.zmax, p.z);
    setPrice(G, i); pl.tr++; pl.vol += q.x; pl.last = G.t; if (pl.seen.indexOf(i) < 0) pl.seen.push(i);
    G.fees = (G.fees || 0) + fee;
    tape(G, pl, 'B', i, S, q.x / S);
    return { ok: true, S, x: q.x, avg: q.x / S };
  }
  function otherPos(G, pl, skip) { let s = 0; for (let k = 0; k < NP; k++) if (k !== skip && pl.hold[k]) s += pl.hold[k] * G.pr[k].P; return s; }
  function trySell(G, pl, i, S) {
    const p = G.pr[i]; S = Math.floor(S);
    if (G.ph !== 'run') return { ok: false, err: G.ph === 'pause' ? 'Market paused' : 'Market closed' };
    if (p.st !== 'live') return { ok: false, err: 'Not tradable' };
    if (!(S >= 1) || S > pl.hold[i]) return { ok: false, err: 'You do not hold that many shares' };
    const q = quoteSell(G, i, S), fee = q.x * G.cfg.fee, got = q.x - fee;
    const frac = S / pl.hold[i]; const basis = pl.cost[i] * frac;
    pl.cash += got; pl.hold[i] -= S; pl.cost[i] -= basis; p.z = Math.max(-2, q.z1); p.flow -= q.x; p.vol += q.x;
    setPrice(G, i); pl.tr++; pl.vol += q.x; pl.last = G.t;
    G.fees = (G.fees || 0) + fee;
    tape(G, pl, 'S', i, S, q.x / S);
    return { ok: true, S, x: q.x, avg: q.x / S, pnl: got - basis };
  }
  function tryDD(G, pl, i) {
    const p = G.pr[i];
    if (G.ph !== 'run') return { ok: false, err: 'Market closed' };
    if (p.st !== 'live') return { ok: false, err: 'Not available' };
    if (pl.dd[i] != null) return { ok: true, score: pl.dd[i], again: true };
    if (pl.cash < G.cfg.ddCost) return { ok: false, err: 'Not enough cash' };
    const rr = rndS(hash(pl.id + '|' + p.code + '|' + (p.ddseed || 0)));
    const score = Math.round(clamp(p.q + norm(rr) * G.cfg.sigDD, 0, 1) * 100);
    pl.cash -= G.cfg.ddCost; pl.dd[i] = score; pl.ddn++; pl.last = G.t;
    G.ddRev = (G.ddRev || 0) + G.cfg.ddCost;
    return { ok: true, score };
  }
  function tape(G, pl, side, i, S, px) {
    const e = { t: G.t, s: side, n: G.cfg.anon ? 'Investor' : pl.name, c: PROJ[i].code, q: S, p: round(px, 2), id: ++G.seq };
    G.tape.unshift(e); if (G.tape.length > 40) G.tape.pop();
  }
  function act(G, pid, a) {
    const pl = G.pl[pid]; if (!pl) return { ok: false, err: 'Unknown player' };
    const i = a.p | 0; if (i < 0 || i >= NP) return { ok: false, err: 'Bad project' };
    let r;
    if (a.k === 'b') r = tryBuy(G, pl, i, a.s);
    else if (a.k === 's') r = trySell(G, pl, i, a.s);
    else if (a.k === 'd') r = tryDD(G, pl, i);
    else r = { ok: false, err: 'Unknown action' };
    pl.ack = { sq: a.sq, ok: r.ok, err: r.err || null, k: a.k, p: i, S: r.S || 0, x: r.x ? Math.round(r.x) : 0, sc: r.score != null ? r.score : null };
    return r;
  }

  // ------------------------------------------------------------------ tick
  function snapshot(G) {
    const alloc = [0, 0, 0]; let tot = 0;
    for (const id of G.ord) { const pl = G.pl[id]; for (let i = 0; i < NP; i++) if (pl.hold[i]) { const v = pl.hold[i] * G.pr[i].P; alloc[G.pr[i].h - 1] += v; tot += v; } }
    const byP = G.pr.map((p, i) => { let s = 0; for (const id of G.ord) s += G.pl[id].hold[i] * p.P; return s; });
    const hhi = tot > 0 ? byP.reduce((a, v) => a + (v / tot) * (v / tot), 0) : 0;
    G.hist.push({ t: G.t, alloc: alloc.map(x => tot ? x / tot : 0), invested: tot, hhi, P: G.pr.map(p => round(p.P, 2)), z: G.pr.map(p => round(p.z, 3)) });
    for (const id of G.ord) { const pl = G.pl[id]; pl.nwh.push(round(netWorth(G, pl), 0)); }
  }

  function advance(G) {
    if (G.ph !== 'run' && G.ph !== 'pause') return;
    const T = G.T; G.t++; const t = G.t; const news = [];
    const R = () => rnd(G);
    // 1. macro events
    for (const e of G.ev) if (e.t === t) fire(G, e.k, news);
    if (G.fcUntil && t >= G.fcUntil) { G.fc = 1; G.fcUntil = 0; }
    if (G.rum && G.rum.t2 === t) resolveRumour(G, news);
    // 2. per-project updates
    for (let i = 0; i < NP; i++) {
      const p = G.pr[i]; if (p.st !== 'live') continue;
      // traction reading
      const rr = rndS(hash(p.code + ':' + t + ':' + G.rs));
      p.obs.push(clamp(p.q + norm(rr) * G.cfg.sigTr, 0, 1));
      // burn and primary raise
      const raise = G.cfg.phi * G.fc * Math.max(0, p.flow);
      const avail = p.cash + raise; p.sf += Math.max(0, p.burn - avail); p.cash = Math.max(0, avail - p.burn);
      p.raised += raise; p.cls += Math.max(0, p.flow);
      p.flowP = p.flow; p.flow = 0;
      // sentiment random walk with mean reversion
      p.sent *= Math.exp(norm(R) * G.cfg.sigSent - 0.1 * Math.log(p.sent));
      // pressure decays
      p.z *= (1 - G.cfg.lam);
      // gate
      const g = nextGate(G, i);
      if (g != null && g === t) resolveGate(G, i, news);
    }
    // 3. macro multipliers drift back towards their targets
    for (let h = 0; h < 3; h++) G.mac[h] += (G.macT[h] - G.mac[h]) * 0.25;
    // 4. anchors and prices
    for (let i = 0; i < NP; i++) { const p = G.pr[i]; if (p.st === 'live') { p.zmax = Math.max(p.zmax, p.z); recomputeAnchor(G, i); } }
    // 5. settlement
    if (t >= T) settle(G, news);
    for (const n of news) G.news.unshift({ t, x: n });
    if (G.news.length > 60) G.news.length = 60;
    for (const p of G.pr) p.ph.push(round(p.P, 2));
    snapshot(G);
  }

  function recomputeAll(G) { for (let i = 0; i < NP; i++) { const p = G.pr[i]; if (p.st === 'live') recomputeAnchor(G, i); } }

  function resolveGate(G, i, news) {
    const p = G.pr[i], H = HP[p.h]; const R = () => rnd(G);
    const gap = Math.max(1, G.t - p.lg);
    const ps = 1 - clamp(p.sf / (p.burn * gap), 0, 1);
    p.sf = 0; p.lg = G.t;
    const pass = R() < pGate(p.h, p.q, ps);
    p.gl.push({ t: G.t, ps: round(ps, 2), ok: pass, pg: round(pGate(p.h, p.q, ps), 2) });
    const label = STAGES[p.stage + 1];
    if (pass) {
      const up = H.u * (0.92 + 0.16 * R());
      p.v *= up; p.stage++; p.gi++; p.ups.push(round(up, 2));
      const nn = nextGate(G, i);
      if (nn != null) p.cash += p.burn * (nn - G.t) * 0.4; // outside round
      news.push(p.name + ' cleared its ' + (p.stage === 3 ? 'final gate and is exit-ready' : 'gate and raised ' + label) + '. Valuation step-up x' + round(up, 2) + (ps < 0.6 ? ' (the cash was nearly gone).' : '.'));
      // price will be recomputed from the new anchor
    } else {
      p.st = 'dead'; p.gi++; p.P = Math.max(0.2, p.P * 0.05); p.A = p.P; p.z = 0;
      news.push(p.name + ' failed its ' + STAGES[p.stage] + ' gate' + (ps < 0.6 ? ' with the cash nearly gone' : '') + '. The project is wound down; shares are worth about 5% of the last price.');
    }
  }
  function fire(G, k, news) {
    const R = () => rnd(G);
    if (k === 'hype') {
      G.mac[2] *= 1.30; G.macT[2] = 1.0;
      news.push('Deep-tech frenzy: investors chase breakthrough stories. Breakthrough projects are being bid up.');
    } else if (k === 'winter') {
      G.mac[0] *= 0.93; G.mac[1] *= 0.86; G.mac[2] *= 0.74; G.macT = [0.97, 0.94, 0.88];
      G.fc = 0.35; G.fcUntil = G.t + 3;
      news.push('Rates rise and funding dries up. Growth valuations fall and fewer euros reach the companies for three periods.');
    } else if (k === 'disrupt') {
      G.mac[0] *= 0.88; G.macT[0] = Math.min(G.macT[0], 0.9); G.mac[1] *= 1.06; G.macT[1] = Math.max(G.macT[1], 1.0);
      news.push('A disruptor changes the rules in the core market. Core projects lose 12% and adjacent ones gain.');
    } else if (k === 'rumour') {
      const cand = G.pr.filter(p => p.st === 'live' && p.h >= 2 && p.stage < 3);
      if (!cand.length) return;
      const p = cand[Math.floor(R() * cand.length)];
      const real = R() < 0.5;
      G.rum = { i: p.i, t2: G.t + 2, real }; p.sent *= 1.15;
      news.push('Rumour: a global player is in talks to acquire ' + p.name + '. Nothing is confirmed.');
    }
    G.log.push({ t: G.t, k });
  }
  function resolveRumour(G, news) {
    const rm = G.rum; G.rum = null; if (!rm) return; const p = G.pr[rm.i];
    if (p.st !== 'live') return;
    if (rm.real) {
      const px = p.A * 1.55; p.P = px; p.st = 'sold'; p.exitV = px; p.z = 0;
      for (const id of G.ord) { const pl = G.pl[id]; if (pl.hold[p.i]) { pl.cash += pl.hold[p.i] * px; pl.hold[p.i] = 0; pl.cost[p.i] = 0; } }
      news.push(p.name + ' is acquired at ' + round(px, 1) + ' per share. All holders are paid out in cash.');
    } else {
      p.sent *= 0.80; news.push('Talks about ' + p.name + ' are off. The price falls back.');
    }
  }
  function settle(G, news) {
    G.ph = 'end';
    for (const p of G.pr) {
      if (p.st === 'live') { p.P = p.v; p.A = p.v; p.z = 0; p.st = 'exit'; p.exitV = p.v; }
    }
    news.push('Final settlement: every surviving project exits at its realised valuation. Prices now equal fundamentals.');
  }

  // ------------------------------------------------------------------ outputs
  function leaderboard(G) {
    return G.ord.map(id => { const pl = G.pl[id]; const w = netWorth(G, pl); return { id, n: pl.name, w, r: w / G.cfg.cash0 - 1, bot: !!pl.bot, tr: pl.tr }; }).sort((a, b) => b.w - a.w);
  }
  function pub(G) {
    const lb = leaderboard(G);
    return {
      ph: G.ph, t: G.t, T: G.T, n: G.ord.length, P: G.pr.map(p => round(p.P, 2)), fl: G.pr.map(p => Math.round(p.flow)), st: G.pr.map(p => p.st),
      tape: G.tape.slice(0, 14), w: lb.map(x => Math.round(x.w / 100) * 100), top: lb.slice(0, 10).map(x => [x.n, Math.round(x.w), x.bot ? 1 : 0]), cnt: lb.length,
    };
  }
  function tk(G) { // slow-changing snapshot
    return {
      tickSec: G.cfg.tickSec, t: G.t, T: G.T, ph: G.ph, K: Math.round(G.K), cash0: G.cfg.cash0, fee: G.cfg.fee, ddCost: G.cfg.ddCost, maxExp: G.cfg.maxExp,
      news: G.news.slice(0, 20),
      pr: G.pr.map(p => ({ v: round(p.v, 2), stage: p.stage, st: p.st, cash: Math.round(p.cash), burn: Math.round(p.burn), gate: nextGate(G, p.i), gates: p.gates, gi: p.gi, obs: p.obs.map(o => Math.round(o * 100)), cons: round(consensus(G, p.i), 3), ph: p.ph, flowP: Math.round(p.flowP), D: Math.round(p.D), vol: Math.round(p.vol), ups: p.ups, cls: Math.round(p.cls), exitV: p.exitV != null ? round(p.exitV, 2) : null, ps: round(psi(G, p.i), 2) })),
      lbAll: G.ph === 'end' ? leaderboard(G).map(x => [x.n, Math.round(x.w), x.bot ? 1 : 0]) : null,
      db: G.ph === 'end' ? debrief(G) : null,
    };
  }
  function priv(G, pid) {
    const pl = G.pl[pid]; if (!pl) return null;
    return { id: pl.id, name: pl.name, cash: round(pl.cash, 2), hold: pl.hold, cost: pl.cost.map(x => round(x, 0)), dd: pl.dd, nw: round(netWorth(G, pl), 0), tr: pl.tr, ack: pl.ack, nwh: pl.nwh, rank: leaderboard(G).findIndex(x => x.id === pid) + 1, n: G.ord.length };
  }


  function debrief(G) {
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const hum = G.ord.map(id => G.pl[id]).filter(p => !p.bot);
    const all = G.ord.map(id => G.pl[id]);
    const ret = pl => netWorth(G, pl) / G.cfg.cash0 - 1;
    const rs = all.map(ret).sort((a, b) => a - b); const qt = f => rs.length ? rs[Math.min(rs.length - 1, Math.floor(f * (rs.length - 1) + 0.5))] : 0;
    const ddG = hum.filter(p => p.ddn >= 2), noDD = hum.filter(p => p.ddn === 0);
    const xs = hum.map(p => p.seen.length), ys = hum.map(ret);
    const mx = avg(xs), my = avg(ys); let cov = 0, vx = 0, vy = 0;
    for (let i = 0; i < xs.length; i++) { cov += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; }
    const corr = vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : null;
    return {
      q: [round(qt(0), 3), round(qt(0.25), 3), round(qt(0.5), 3), round(qt(0.75), 3), round(qt(1), 3)],
      ddN: ddG.length, ddRet: ddG.length ? round(avg(ddG.map(ret)), 3) : null, noN: noDD.length, noRet: noDD.length ? round(avg(noDD.map(ret)), 3) : null,
      corr: corr == null ? null : round(corr, 2), fees: Math.round(G.fees || 0), ddRev: Math.round(G.ddRev || 0),
      alloc: G.hist.map(h => [h.t, round(h.alloc[0], 3), round(h.alloc[1], 3), round(h.alloc[2], 3), round(h.hhi, 3), Math.round(h.invested)]),
      proj: G.pr.map(p => ({ c: p.code, n: p.name, h: p.h, st: p.st, ph: p.ph, q: round(p.q, 2), gl: p.gl, cls: Math.round(p.cls), zmax: round(p.zmax, 2), ex: p.exitV != null ? round(p.exitV, 2) : null })),
    };
  }

  // ------------------------------------------------------------------ bots (host side)
  const BOTS = ['index', 'momentum', 'informed', 'contrarian', 'gambler'];
  function botAct(G, pl, rng) {
    if (G.ph !== 'run') return;
    const stl = pl.bot; const live = G.pr.filter(p => p.st === 'live');
    if (!live.length) return;
    const buyCash = (i, x) => { const S = Math.min(sharesForCash(G, i, x), maxBuyShares(G, pl, i)); if (S >= 1) tryBuy(G, pl, i, S); };
    const sellFrac = (i, f) => { const S = Math.floor(pl.hold[i] * f); if (S >= 1) trySell(G, pl, i, S); };
    const nw = netWorth(G, pl);
    if (stl === 'index') {
      const tgt = { 1: 0.45, 2: 0.30, 3: 0.20 }; // roughly portfolio-minded
      const cand = live.filter(p => pl.hold[p.i] * p.P < nw * 0.12);
      if (cand.length && pl.cash > nw * 0.08) { const p = cand[Math.floor(rng() * cand.length)]; buyCash(p.i, Math.min(pl.cash, nw * 0.07) * tgt[p.h] / 0.3); }
    } else if (stl === 'momentum') {
      const sc = live.map(p => ({ p, m: (p.P / (p.ph[Math.max(0, p.ph.length - 2)] || p.P)) - 1 + p.flowP / (G.K * 0.02) + p.flow / (G.K * 0.02) }));
      sc.sort((a, b) => b.m - a.m);
      if (rng() < 0.7 && pl.cash > nw * 0.05) buyCash(sc[0].p.i, Math.min(pl.cash, nw * 0.1));
      const w = sc[sc.length - 1]; if (pl.hold[w.p.i] > 0 && w.m < -0.02) sellFrac(w.p.i, 0.6);
    } else if (stl === 'informed') {
      // buys DD on a few breakthrough/adjacent projects, then trades on own belief
      const open = live.filter(p => pl.dd[p.i] == null && p.h >= 2);
      if (pl.ddn < 4 && open.length && pl.cash > nw * 0.3) tryDD(G, pl, open[Math.floor(rng() * open.length)].i);
      for (const p of live) {
        if (pl.dd[p.i] == null) continue;
        const belief = 0.65 * pl.dd[p.i] / 100 + 0.35 * consensus(G, p.i);
        const fair = baseAnchor(G, p.i, belief) * G.mac[p.h - 1] * p.sent;
        const edge = fair / p.P - 1;
        if (edge > 0.12 && pl.cash > nw * 0.05) { buyCash(p.i, Math.min(pl.cash, nw * 0.12)); break; }
        if (edge < -0.12 && pl.hold[p.i] > 0) { sellFrac(p.i, 0.8); break; }
      }
      if (pl.ddn === 0 && pl.cash > nw * 0.08) { const p = live[Math.floor(rng() * live.length)]; buyCash(p.i, nw * 0.06); }
    } else if (stl === 'contrarian') {
      const chg = p => p.P / (p.ph[Math.max(0, p.ph.length - 2)] || p.P) - 1;
      const sc = live.map(p => ({ p, m: chg(p) })); sc.sort((a, b) => a.m - b.m);
      if (sc[0].m < -0.04 && pl.cash > nw * 0.05) buyCash(sc[0].p.i, Math.min(pl.cash, nw * 0.1));
      const hi = sc[sc.length - 1]; if (hi.m > 0.12 && pl.hold[hi.p.i] > 0) sellFrac(hi.p.i, 0.7);
      if (G.t < 2 && pl.cash > nw * 0.6) { const p = live[Math.floor(rng() * live.length)]; buyCash(p.i, nw * 0.1); }
    } else { // gambler: breakthrough heavy
      const c = live.filter(p => p.h === 3); if (c.length && pl.cash > nw * 0.06) { const p = c[Math.floor(rng() * c.length)]; buyCash(p.i, Math.min(pl.cash, nw * 0.25)); }
    }
  }

  const API = { recomputeAll, debrief, HP, PROJ, NP, STAGES, DEF, BOTS, hash, rndS, clamp, round, pGate, newGame, addPlayer, start, act, advance, netWorth, leaderboard, pub, tk, priv, consensus, baseAnchor, psi, nextGate, need, quoteBuy, quoteSell, sharesForCash, maxBuyShares, tryBuy, trySell, tryDD, botAct, fire, setupMarket, snapshot, evMult };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DC = API;
})(typeof self !== 'undefined' ? self : this);

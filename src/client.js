/* student client and company detail (the detail view is also used by the host) */
const C = { room: '', url: '', net: null, me: null, pub: null, pubV: null, tk: null, priv: null, privNet: null, off: 0, st: 'down', tab: 'market', sel: null, side: 'buy', amt: 5000, sell: 0.5, pending: null, sq: Date.now(), lastPubAt: 0, lastAck: 0, gotPriv: false, belief: {}, dirty: false, tf: 'live', bars: Array.from({ length: 15 }, () => []), news: [], newsSeen: 0, newsInit: false, openP: new Set(), prac: null, rdy: false, rdyAt: 0, nc: null, ncY: -1, phSeen: null, lastNews: 0 };

function nowHost() { return Date.now() + C.off; }
function PV() { return C.pubV || C.pub; }
function liveNW() { const p = C.priv, P = PV(); if (!p || !P || !P.P.length) return p ? p.cash : 0; let w = p.cash; for (let i = 0; i < p.hold.length; i++) if (p.hold[i]) w += p.hold[i] * P.P[i]; return w; }
function prevNW() { const p = C.priv, P = PV(); if (!p || !P || !P.pp) return liveNW(); let w = p.cash; for (let i = 0; i < p.hold.length; i++) if (p.hold[i]) w += p.hold[i] * P.pp[i]; return w; }

/* ---------- bars and news bookkeeping ---------- */
function mergeBar(arr, b) {
  const last = arr[arr.length - 1];
  if (!last || b[0] > last[0]) { arr.push(b); return; }
  for (let k = arr.length - 1; k >= 0; k--) { if (arr[k][0] === b[0]) { arr[k] = b; return; } if (arr[k][0] < b[0]) { arr.splice(k + 1, 0, b); return; } }
  arr.unshift(b);
}
function mergeNews(list) {
  if (!list) return; const have = new Set(C.news.map(x => x.id)); let add = 0;
  for (const n of list) if (!have.has(n.id)) { C.news.push(n); add++; }
  if (add) { C.news.sort((a, b) => b.id - a.id); if (C.news.length > 120) C.news.length = 120; C.lastNews = Date.now(); }
}
function eventLog(q) { return q.gl.map((g, k) => ({ t: g.t, ok: g.ok, k: EVS[k] })); }

/* shared candle block for a company */
function candleBlock(i, o) { // o: {tf, bars, cur, curY, tk, key, w, h}
  const q = i >= DC.NP ? { st: 'live', gl: [] } : o.tk.pr[i], mode = o.tf === 'year' ? 'year' : 'live';
  const live = q.st === 'live';
  const b = buildCandles(o.bars, live ? o.cur : null, o.curY, mode, eventLog(q), mode === 'live' ? (window.innerWidth <= 560 ? 36 : 56) : 0);
  const tg = '<div class="seg tf"><button class="' + (mode === 'live' ? 'on' : '') + '" data-act="tf" data-m="live">Live · 5 s candles</button><button class="' + (mode === 'year' ? 'on' : '') + '" data-act="tf" data-m="year">By year</button></div>';
  return '<div class="row" style="justify-content:space-between;margin:8px 0 2px">' + tg + '<span class="small faint">green = rose · red = fell</span></div>' +
    candleChart({ cs: b.cs, marks: b.marks, xl: b.xl, slots: mode === 'live' ? (window.innerWidth <= 560 ? 36 : 56) : o.tk.T, w: o.w || 380, h: o.h || 190, floor0: true, minRange: (o.last || 10) * 0.015, last: o.last, label: DC.ALL[i].name + ' price candles' });
}

/* ---------- company detail ---------- */
function detailTop(i, pub, tk, priv, isHost, ctx) {
  const d = DC.PROJ[i], q = tk.pr[i], H = DC.HP[d.h], P = pub.P[i], pp = pub.pp ? pub.pp[i] : P, so = P / (q.ph[0] || P) - 1, live = q.st === 'live';
  const lab = projLabel(i, tk), run = q.burn ? q.cash / q.burn : 0, need = q.gate != null ? q.burn * Math.max(1, q.gate - pub.t) : 0;
  const cov = need ? Math.min(1, q.cash / need) : 1;
  let h = '<div class="ph"><div><div class="row"><span class="hd h' + d.h + 'c"></span><h2 style="padding:0;border:0">' + d.code + ' · ' + esc(d.name) + '</h2></div><div class="small muted">' + esc(d.line) + '</div></div><span class="spacer"></span><div style="text-align:right"><span class="chip ' + lab.c + '">' + lab.t + '</span><div class="small faint" style="margin-top:3px">' + RISK[d.h] + '</div></div></div><div class="pb">';
  h += '<div class="row" style="align-items:baseline;gap:12px"><b class="mono bigpx' + (live ? flashCls('d' + i + (isHost ? 'h' : ''), P) : '') + '">€' + px(P) + '</b>' + (live ? chgHTML(P, pp) : '') + '<span class="spacer"></span><span class="small ' + cls(so) + ' mono">since open ' + pct(so, 1) + '</span></div>';
  h += candleBlock(i, { tf: ctx.tf, bars: ctx.bars[i], cur: pub.cb && pub.ph !== 'prep' ? pub.cb[i] : null, curY: Math.min(pub.t + 1, pub.T), tk: tk, last: P });
  h += '<div class="facts"><div class="fact"><span>Volume traded</span><b>' + eurK(q.vol) + '</b></div><div class="fact"><span>Net buying this year</span><b class="' + cls(pub.fl[i]) + '">' + eurS(pub.fl[i]) + '</b></div>' +
    '<div class="fact"><span>Next event</span><b>' + (live && q.gate != null ? EVS[q.gi] + ' · end of year ' + q.gate : '—') + '</b></div><div class="fact"><span>Events left</span><b>' + (live ? q.gates.length - q.gi : 0) + ' of 3</b></div>' +
    '<div class="fact"><span>Liquidity</span><b title="Money needed to push the price up by about 10%">' + eurK(q.D * 0.0953) + ' = +10%</b></div><div class="fact"><span>Gain if next event succeeds</span><b>≈ ×' + H.u.toFixed(2) + '</b></div><div class="fact"><span>Value per share at last round</span><b>€' + px(q.v) + '</b></div><div class="fact"><span>Total bought by class</span><b>' + eurK(q.cls) + '</b></div></div>';
  if (live) {
    h += '<h3 style="margin-top:8px">Cash in the bank</h3><div class="small muted">€' + Math.round(q.cash / 1000) + 'k in the bank · spends ' + eurK(q.burn) + ' per year · lasts ' + run.toFixed(1) + ' years. Funded for the next event: <b>' + Math.round(cov * 100) + '%</b>. Money from buyers flows into the company; a company that runs dry before its event is more likely to fail.</div><div class="meter ' + (cov < 0.4 ? 'low' : cov < 0.75 ? 'mid' : '') + '"><i style="width:' + (cov * 100).toFixed(0) + '%"></i></div>';
    h += '<h3 style="margin-top:14px">Analyst score <span class="faint small">public, 0 to 100</span></h3><div class="row"><div>' + (q.obs.length ? sparkline(q.obs, 180, 40, 'var(--h' + d.h + ')') : '<span class="faint small">First score arrives after year 1</span>') + '</div><div class="small muted">Latest ' + (q.obs.length ? q.obs[q.obs.length - 1] : '—') + ' · average rating <b>' + Math.round(q.cons * 100) + '</b> (starts at 50)</div></div>';
    const odds = [30, 50, 70, 90].map(s => '<td>' + Math.round(DC.pGate(d.h, s / 100, q.ps) * 100) + '%</td>').join('');
    h += '<h3 style="margin-top:14px">Chance the next event succeeds</h3><table class="tbl-sm"><thead><tr><th style="text-align:left">If the true score is</th><th>30</th><th>50</th><th>70</th><th>90</th></tr></thead><tbody><tr><td style="text-align:left">Chance of success</td>' + odds + '</tr></tbody></table><p class="small faint">A failed round or IPO wipes out about 95% of the share price; a success lifts it.</p>';
    if (!isHost) {
      const sc = priv && priv.dd && priv.dd[i];
      h += '<div class="note" style="margin-top:10px">' + (sc != null ? '<b>Your analyst report:</b> score <b>' + sc + '</b> (typical error ±10). Only you can see it. The public score is noisier; this one is sharper.' : '<div class="row"><span><b>Analyst report</b> · a private, sharper score for this company (error ±10) for ' + eur(tk.ddCost) + '.</span><span class="spacer"></span><button class="btn sm" data-act="dd" data-i="' + i + '">Buy report</button></div>') + '</div>';
    }
  } else {
    const st = q.st === 'dead' ? 'This company failed. Its shares are worth roughly 5% of the last price.' : q.st === 'sold' ? 'Acquired. Holders were paid out in cash at €' + px(q.exitV) + ' per share.' : 'Final payout at €' + px(q.exitV) + ' per share.';
    h += '<div class="note">' + st + '</div>';
  }
  return h + '</div>';
}
function valHTML(i, pub, tk, priv) {
  if (i >= DC.NP) return '';
  const q = tk.pr[i]; if (q.st !== 'live') return '';
  const sc = priv && priv.dd && priv.dd[i] != null ? priv.dd[i] : Math.round(q.cons * 100);
  const cur = C.belief[i] != null ? C.belief[i] : sc;
  return '<div class="ticket"><h3>Fair value estimator</h3><p class="small muted">Set your own view of the company’s score. The estimator weighs the chance of each remaining event, discounts to the end and compares with today’s price. It ignores market mood and news.</p><div class="row"><input class="slider" id="vq" type="range" min="10" max="95" value="' + cur + '" style="flex:1"><b class="mono" id="vqv">' + cur + '</b></div><div class="quote"><span>Fair value per share</span><span id="vmv"></span><span>Price now</span><span id="vmp"></span><span>Upside</span><span id="vmu"></span></div></div>';
}
function valUpdate(i) {
  if (i >= DC.NP) return;
  const pub = PV(), tk = C.tk; if (!pub || !tk || !$('#vq')) return; const q = tk.pr[i], d = DC.PROJ[i], H = DC.HP[d.h];
  const s = +$('#vq').value; C.belief[i] = s; $('#vqv').textContent = s;
  const rem = q.gates.length - q.gi, pg = DC.pGate(d.h, s / 100, q.ps);
  const mv = q.v * Math.pow(pg * H.u, rem) / Math.pow(1 + H.r, pub.T - pub.t);
  $('#vmv').textContent = '€' + px(mv); $('#vmp').textContent = '€' + px(pub.P[i]); const u = mv / pub.P[i] - 1; const e = $('#vmu'); e.textContent = pct(u, 0); e.className = cls(u);
}

/* ---------- order ticket ---------- */
function ticketMax(i) {
  if (i >= DC.NP) { const P0 = PV().P[i]; return Math.max(0, Math.floor(C.priv.cash / (P0 * (1 + C.tk.fee * 0.4)))); }
  const pub = PV(), tk = C.tk, p = C.priv, q = tk.pr[i], P = pub.P[i]; if (q.st !== 'live') return 0;
  const ok = S => { const u = S * P / q.D; if (u >= 0.95) return false; const x = -q.D * Math.log(1 - u), cost = x * (1 + tk.fee); if (cost > p.cash + 1e-9) return false; const Pn = P * Math.exp(x / q.D); let oth = 0; for (let k = 0; k < p.hold.length; k++) if (k !== i && p.hold[k]) oth += p.hold[k] * pub.P[k]; const pos = (p.hold[i] + S) * Pn; return pos <= tk.maxExp * ((p.cash - cost) + pos + oth) + 1e-6; };
  let lo = 0, hi = Math.floor(0.94 * q.D / P); while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (ok(m)) lo = m; else hi = m - 1; } return lo;
}
function ticketHTML(i) {
  const q = i >= DC.NP ? { st: 'live' } : C.tk.pr[i]; if (q.st !== 'live') return '';
  const amts = [2000, 5000, 10000, 25000];
  return '<div class="ticket"><div class="row"><div class="seg"><button class="buy' + (C.side === 'buy' ? ' on' : '') + '" data-act="side" data-s="buy">Buy</button><button class="sell' + (C.side === 'sell' ? ' on' : '') + '" data-act="side" data-s="sell">Sell</button></div><span class="spacer"></span><span class="small muted">Cash <b id="tcash" class="mono"></b></span></div>' +
    (C.side === 'buy' ? '<div class="amts">' + amts.map(a => '<button class="btn sm' + (C.amt === a ? ' on' : '') + '" data-act="amt" data-a="' + a + '">' + eurK(a) + '</button>').join('') + '<button class="btn sm' + (C.amt === 'max' ? ' on' : '') + '" data-act="amt" data-a="max">Max</button><input id="tcu" type="number" inputmode="numeric" min="0" step="500" placeholder="€ custom" style="width:100px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px 8px;min-height:30px"></div>'
      : '<div class="amts">' + [0.25, 0.5, 0.75, 1].map(f => '<button class="btn sm' + (C.sell === f ? ' on' : '') + '" data-act="frac" data-f="' + f + '">' + Math.round(f * 100) + '%</button>').join('') + '</div>') +
    '<div class="quote" id="tq"></div><div id="tw"></div><button class="btn pri" id="tgo" data-act="exec" style="width:100%"></button><p class="small faint" style="margin:6px 0 0">The price moves every second, so your fill can differ slightly from this quote.</p></div>';
}
function quoteState(i) {
  if (i >= DC.NP) { // bonds and index: fair price, no price impact, smaller fee
    const P = PV().P[i], fr = C.tk.fee * 0.4, p = C.priv; let S;
    if (C.side === 'buy') { const amt = C.amt === 'max' ? 1e12 : C.amt === 'cust' ? (C.custom || 0) : C.amt; S = Math.floor(Math.min(amt, p.cash) / (P * (1 + fr))); if (S < 1) return { S: 0, x: 0, fee: 0, tot: 0, avg: P, ok: false, warn: 'Amount too small or not enough cash.' }; const x = S * P; return { S, x, fee: x * fr, tot: x * (1 + fr), avg: P, ok: true, warn: '' }; }
    S = Math.floor(p.hold[i] * C.sell); if (S < 1) return { S: 0, x: 0, fee: 0, tot: 0, avg: P, ok: false, warn: 'You hold none of this.' }; const x = S * P; return { S, x, fee: x * fr, tot: x * (1 - fr), avg: P, ok: true, warn: '' };
  }
  const pub = PV(), tk = C.tk, p = C.priv, q = tk.pr[i], P = pub.P[i]; let S = 0, x = 0, ok = true, warn = '';
  if (C.side === 'buy') {
    let amt = C.amt === 'max' ? 1e12 : C.amt; if (C.amt === 'cust') amt = C.custom || 0;
    if (C.amt === 'max') S = ticketMax(i); else { S = DC.sharesForCash({ pr: [{ D: q.D, P: P }] }, 0, Math.min(amt, p.cash)); }
    if (S >= 1) { const u = S * P / q.D; if (u >= 0.95) { S = Math.floor(0.94 * q.D / P); } x = -q.D * Math.log(1 - S * P / q.D); }
    const mx = ticketMax(i); if (S > mx) { S = mx; x = S >= 1 ? -q.D * Math.log(1 - S * P / q.D) : 0; warn = S < 1 ? 'Not allowed: not enough cash, or more than ' + Math.round(tk.maxExp * 100) + '% of your portfolio in one company.' : 'Reduced to your limit (cash or ' + Math.round(tk.maxExp * 100) + '% of portfolio in one company).'; }
    if (S < 1) { ok = false; if (!warn) warn = 'Amount too small or not allowed.'; }
    const fee = x * tk.fee; return { S, x, fee, tot: x + fee, avg: S ? x / S : 0, ok, warn };
  }
  S = Math.floor(p.hold[i] * C.sell); if (S < 1) return { S: 0, x: 0, fee: 0, tot: 0, avg: 0, ok: false, warn: 'You hold no shares of this company.' };
  x = q.D * Math.log(1 + S * P / q.D); const fee = x * tk.fee; return { S, x, fee, tot: x - fee, avg: x / S, ok: true, warn: '' };
}
function ticketUpdate() {
  const i = C.sel; if (i == null || !C.pub || !C.tk || !C.priv || !$('#tq')) return; const q = i >= DC.NP ? { st: 'live' } : C.tk.pr[i]; if (q.st !== 'live') return;
  const r = quoteState(i), P = PV().P[i], ph = C.pub.ph; $('#tcash').textContent = eur(C.priv.cash);
  const slip = r.S ? r.avg / P - 1 : 0;
  $('#tq').innerHTML = C.side === 'buy' ? '<span>Shares</span><span>' + r.S + '</span><span>Average price</span><span>€' + (r.S ? px(r.avg) : '—') + ' <span class="' + (slip > 0.02 ? 'wn' : '') + '">(' + pct(slip, 1) + ' price impact)</span></span><span>Fee</span><span>' + eur(r.fee) + '</span><span><b>You pay</b></span><span><b>' + eur(r.tot) + '</b></span>' :
    '<span>Shares</span><span>' + r.S + ' of ' + C.priv.hold[i] + '</span><span>Average price</span><span>€' + (r.S ? px(r.avg) : '—') + ' <span class="' + (slip < -0.02 ? 'wn' : '') + '">(' + pct(slip, 1) + ' price impact)</span></span><span>Fee</span><span>' + eur(r.fee) + '</span><span><b>You receive</b></span><span><b>' + eur(r.tot) + '</b></span>';
  $('#tw').innerHTML = r.warn ? '<div class="note warn">' + esc(r.warn) + '</div>' : '';
  const b = $('#tgo'); b.textContent = (ph === 'prep' ? 'Practice ' : '') + (C.side === 'buy' ? 'Buy ' : 'Sell ') + r.S + ' ' + DC.ALL[i].code; b.className = 'btn ' + (C.side === 'buy' ? 'pri' : 'sell'); b.disabled = !r.ok || !!C.pending || (ph !== 'run' && ph !== 'prep');
  if (ph === 'pause') $('#tw').innerHTML = '<div class="note warn">' + (C.pub.bk ? 'Planning break: trading reopens when the next year starts.' : 'Market paused by the host.') + '</div>';
}

/* ---------- practice mode: a private sandbox that never touches the real market ---------- */
function pracNew() { return { cash: C.tk ? C.tk.cash0 : 100000, hold: new Array(DC.NA).fill(0), cost: new Array(DC.NA).fill(0), z: new Array(DC.NA).fill(0), dd: {}, tr: 0 }; }
function pracPriv() { const p = C.prac; return { id: C.me.id, name: C.me.name, cash: p.cash, hold: p.hold, cost: p.cost, dd: p.dd, nw: 0, tr: p.tr, ack: null, nwc: [], rdy: C.rdy ? 1 : 0, rank: 1, n: 1 }; }
function pracAct(a) {
  const tk = C.tk, p = C.prac, i = a.p, q = i >= DC.NP ? null : tk.pr[i], P = PV().P[i]; let ack;
  if (i >= DC.NP) {
    const fr = tk.fee * 0.4, x = a.s * P;
    if (a.k === 'b') { p.cash -= x * (1 + fr); p.hold[i] += a.s; p.cost[i] += x * (1 + fr); } else { const f = a.s / p.hold[i]; p.cash += x * (1 - fr); p.cost[i] -= p.cost[i] * f; p.hold[i] -= a.s; }
    p.tr++; ack = { ok: true, k: a.k, p: i, S: a.s, x: Math.round(x) };
  } else if (a.k === 'b') {
    const x = -q.D * Math.log(1 - a.s * P / q.D), cost = x * (1 + tk.fee);
    p.cash -= cost; p.hold[i] += a.s; p.cost[i] += cost; p.z[i] += x / q.D; p.tr++; ack = { ok: true, k: 'b', p: i, S: a.s, x: Math.round(x) };
  } else if (a.k === 's') {
    const x = q.D * Math.log(1 + a.s * P / q.D), got = x * (1 - tk.fee), fr = a.s / p.hold[i];
    p.cash += got; p.cost[i] -= p.cost[i] * fr; p.hold[i] -= a.s; p.z[i] -= x / q.D; p.tr++; ack = { ok: true, k: 's', p: i, S: a.s, x: Math.round(x) };
  } else {
    if (p.dd[i] != null) return; if (p.cash < tk.ddCost) { toast('Not enough cash', true); return; }
    p.cash -= tk.ddCost; p.dd[i] = Math.max(5, Math.min(95, Math.round(q.cons * 100 + (Math.random() - 0.5) * 24))); ack = { ok: true, k: 'd', p: i, sc: p.dd[i] };
  }
  C.priv = pracPriv(); toast('Practice: ' + (ack.k === 'b' ? 'bought ' + ack.S + ' ' + DC.ALL[i].code + ' for ' + eur(ack.x) : ack.k === 's' ? 'sold ' + ack.S + ' ' + DC.ALL[i].code + ' for ' + eur(ack.x) : 'report bought, score ' + ack.sc)); C.dirty = true; refreshView(); renderClient(true);
}
function refreshView() { // practice view = frozen prices moved only by your own practice trades
  const pub = C.pub; if (!pub) return;
  if (pub.ph === 'prep' && C.tk) { if (!C.prac) C.prac = pracNew(); C.pubV = Object.assign({}, pub, { P: pub.P.map((v, i) => Math.round(v * Math.exp(C.prac.z[i]) * 100) / 100), pp: pub.P.slice() }); C.priv = pracPriv(); }
  else { C.pubV = null; C.prac = null; C.priv = C.privNet; }
}

/* ---------- sending actions ---------- */
function sendAct(a) {
  if (C.pub && C.pub.ph === 'prep') { pracAct(a); return; }
  if (C.pending) return; C.sq++; const msg = { k: 'act', id: C.me.id, tok: C.me.tok, sq: C.sq, a: a };
  C.pending = { sq: C.sq, msg: msg, at: Date.now(), retried: false }; C.net.send('a', msg, 1); ticketUpdate();
}
function pendingWatch() {
  const p = C.pending; if (!p) return; const age = Date.now() - p.at;
  if (age > 2500 && !p.retried) { p.retried = true; C.net.send('a', p.msg, 1); }
  if (age > 7000) { C.pending = null; toast('No answer from the host. Check your connection and try again.', true); ticketUpdate(); }
}
function handleAck(a) {
  if (!a || a.sq <= C.lastAck) return; C.lastAck = a.sq;
  if (C.pending && C.pending.sq === a.sq) C.pending = null;
  if (a.k !== 'd') SFX.play(a.ok ? (a.k === 'b' ? 'buy' : 'sell') : 'err');
  if (a.ok) { toast(a.k === 'b' ? 'Bought ' + a.S + ' ' + DC.ALL[a.p].code + ' for ' + eur(a.x) : a.k === 's' ? 'Sold ' + a.S + ' ' + DC.ALL[a.p].code + ' for ' + eur(a.x) : 'Report bought: score ' + a.sc); if (a.k === 'd') C.dirty = true; }
  else toast(a.err || 'Rejected', true);
  ticketUpdate();
}

/* ---------- landing, name, boot ---------- */
function clientLanding(P) {
  const app = $('#app');
  app.innerHTML = '<div class="landing"><div class="hero"><div class="eyebrow">MSc Innovation Management</div><h1>Disruption Cycle: Capital Markets</h1><p class="muted">A live stock market for innovation companies. Prices update every second, and every trade you make moves the price for everybody.</p><div class="cardrow"><div class="card"><h3>I am a student</h3><div class="field"><label>Join code</label><input id="jc" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="e.g. K7M2Q0"></div><button class="btn pri" id="jb">Join</button><div id="je" class="err"></div></div><div class="card"><h3>I am the facilitator</h3><p class="small muted">Run the market from your browser. No server needed.</p><button class="btn" id="hb">Set up the market</button></div></div>' + rejoinHTML() + '</div></div>';
  const rj = $('#rj'); if (rj) rj.onclick = () => { location.hash = rj.dataset.h; location.reload(); };
  $('#jb').onclick = () => { const c = $('#jc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 5) { $('#je').textContent = 'Enter the code shown on the screen.'; return; } const r = c.slice(0, 5), b = c.slice(5) || '0'; location.hash = 'r=' + r + '&b=' + b; location.reload(); };
  $('#hb').onclick = () => { location.hash = 'host=1'; location.reload(); };
}
function rejoinHTML() {
  try { const h = localStorage.getItem('dcap-last'); if (!h) return ''; const P = new URLSearchParams(h.slice(1)), r = (P.get('r') || '').toUpperCase(); if (!r || !localStorage.getItem('dcap-me-' + r)) return ''; return '<div class="card" style="margin-top:12px"><h3>Rejoin your game</h3><p class="small muted">You were playing in room ' + esc(r) + '. Your portfolio is saved on the host.</p><button class="btn pri" id="rj" data-h="' + esc(h) + '">Rejoin room ' + esc(r) + '</button></div>'; } catch (e) { return ''; }
}
function clientStart(P) {
  C.room = P.get('r').toUpperCase(); C.url = brokerUrl(P);
  const key = 'dcap-me-' + C.room; let me = null; try { me = JSON.parse(localStorage.getItem(key)); } catch (e) { }
  if (!me) {
    $('#app').innerHTML = '<div class="landing"><div class="hero"><div class="eyebrow">Room ' + esc(C.room) + '</div><h1>Your name</h1><p class="muted">Your name is shown to the class on the trade feed, the leaderboard and the final results.</p><div class="field"><input id="nm" maxlength="18" autocomplete="nickname" placeholder="First name and initial"></div><button class="btn pri" id="nb">Enter the market</button></div></div>';
    const go = () => { const n = $('#nm').value.trim(); if (!n) return; me = { id: rid(8), tok: rid(14), name: n }; localStorage.setItem(key, JSON.stringify(me)); clientBoot(me); };
    $('#nb').onclick = go; $('#nm').onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#nm').focus(), 50); return;
  }
  clientBoot(me);
}
function clientBoot(me) {
  C.me = me; C.tab = 'guide';
  $('#app').innerHTML = '<header class="top"><div class="mq" id="mq" aria-label="Live prices"></div><div class="wrap"><div class="brand">Disruption Cycle<small>Capital Markets</small></div><div class="clock"><div class="small mono" id="ck"></div><div class="bar"><i id="cb" style="width:0%"></i></div></div><div class="kpi"><b id="kNW">—</b><span id="kNWc" class="kc">Portfolio</span></div><div class="kpi hm"><b id="kCash">—</b><span>Cash</span></div><div class="kpi"><b id="kRank">—</b><span>Rank</span></div><span class="spacer"></span><span class="small muted hm" id="kName"></span>' + SND_BTN + '<span id="cconn" class="conn" title="connection"></span></div><div class="wrap"><div class="tabs deskonly" id="ctabs"></div></div></header><div id="banner"></div><div id="ticker"></div><main class="wrap main"><div id="cbody"></div></main><nav class="bottom" id="cnav"></nav>';
  $('#kName').textContent = me.name;
  clientNet();
  setInterval(() => { if (C.st === 'up') { if (!C.privNet) sendHi(); else C.net.send('a', { k: 'hb', id: C.me.id, tok: C.me.tok }); } }, 9000);
  setInterval(() => { pendingWatch(); renderClient(); }, 500);
  document.addEventListener('click', clientClick); document.addEventListener('input', clientInput);
  window.addEventListener('resize', () => { C.dirty = true; });
  try { localStorage.setItem('dcap-last', location.hash); } catch (e) { }
  const wake = () => { if (document.visibilityState === 'hidden') return; const age = Date.now() - Math.max(C.lastPubAt, C.lastConnAt); if (C.st !== 'up' || age > 4000) clientReconnect(false); };
  document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake); window.addEventListener('pageshow', wake);
  setInterval(() => { if (!C.net || C.denied || (C.pub && C.pub.ph === 'end')) return; const age = Date.now() - Math.max(C.lastPubAt, C.lastConnAt); if ((C.st !== 'up' && Date.now() - C.lastConnAt > 10000) || age > 14000) clientReconnect(false); }, 3000);
  const dot = $('#cconn'); if (dot) { dot.style.cursor = 'pointer'; dot.title = 'Tap to reconnect'; dot.onclick = () => clientReconnect(true); }
  renderClient(true);
}
function clientNet() {
  const me = C.me;
  C.lastConnAt = Date.now(); if (C.net) { try { C.net.close(); } catch (e) { } }
  C.net = netOpen({
    url: C.url, room: C.room, subs: ['pub', 'tk', 'hx', 'u/' + me.id],
    onState: (s, d) => { C.st = s; $('#cconn') && ($('#cconn').className = 'conn ' + (s === 'up' ? 'ok' : s === 'err' ? 'bad' : '')); if (s === 'up') sendHi(); },
    onMsg: (t, m) => {
      if (t === 'pub') {
        C.pub = m; C.off = m.ts - Date.now(); C.lastPubAt = Date.now();
        if (m.bars) m.bars.forEach((a, i) => a.forEach(b => mergeBar(C.bars[i], b))); mergeNews(m.nw);
      } else if (t === 'tk') { C.tk = m; C.off = m.ts - Date.now(); mergeNews(m.news); }
      else if (t === 'hx') { m.b.forEach((arr, i) => { const old = C.bars[i], keep = old.filter(b => !arr.length || b[0] > arr[arr.length - 1][0]); C.bars[i] = arr.slice().concat(keep); }); }
      else if (t.startsWith('u/')) {
        if (m.deny) { C.denied = true; } else {
          C.privNet = m; if (Date.now() - C.rdyAt > 3000) C.rdy = !!m.rdy;
          if (!C.gotPriv) { C.gotPriv = true; if (m.ack) C.lastAck = m.ack.sq; } else if (m.ack && C.pub && C.pub.ph !== 'prep') handleAck(m.ack);
        }
      }
      refreshView(); C.dirty = true;
    },
  });
}
function clientReconnect(manual) {
  C.st = 'down'; const d = $('#cconn'); if (d) d.className = 'conn'; C.pending = null; clientNet(); if (manual) toast('Reconnecting…'); C.dirty = true;
}
function sendHi() { if (C.net) C.net.send('a', { k: 'hi', id: C.me.id, tok: C.me.tok, name: C.me.name }, 1); }
function tabsFor(ph) {
  if (ph === 'prep') return [['guide', 'How to play', '📘'], ['market', 'Market', '📈'], ['port', 'Portfolio', '💼'], ['news', 'News', '📰']];
  if (ph === 'end') return [['results', 'Results', '🏁'], ['market', 'Market', '📈'], ['port', 'Portfolio', '💼'], ['news', 'News', '📰']];
  return [['market', 'Market', '📈'], ['port', 'Portfolio', '💼'], ['news', 'News', '📰'], ['board', 'Leaders', '🏆'], ['guide', 'Guide', '📘']];
}
function guideHTML() {
  const g = (t, d) => '<div class="gl"><b>' + t + '</b><span>' + d + '</span></div>';
  return '<div class="cols"><div class="panel"><h2>How to play in one minute</h2><div class="pb"><ol class="steps"><li><b>You have €100,000.</b> Spread it over 12 young companies, two bonds and an index fund. Each one will go through two funding rounds (Series A and B) and an IPO.</li><li><b>Prices move every second.</b> Buy when you think a company will rise, sell when you think it will fall. The arrow beside each price shows the last change.</li><li><b>Your trades move the price.</b> Buying pushes a price up for everyone, selling pushes it down. Big orders move it more.</li><li><b>Watch the news.</b> Short headlines hint at what is coming: funding rounds, IPOs, market-wide events. Tap a headline to open the company.</li><li><b>Rounds and IPOs decide a lot.</b> If a company passes, its price jumps. If it fails, the price collapses to about 5%.</li><li><b>At the end every company is paid out</b> at its real value. The player with the highest portfolio value wins.</li></ol><div class="note">You may put at most 40% of your portfolio into one company. Each trade costs a 0.5% fee.</div></div></div>' +
    '<div class="panel"><h2>Words you will see</h2><div class="pb gloss">' + g('Price', 'What one share costs right now, in euros.') + g('Bond', 'A loan you give. It pays a fixed coupon every year and is repaid at €100 at the end. Its price falls when interest rates rise.') + g('Index fund', 'One holding that owns all twelve companies equally. It follows the whole market.') + g('Change', 'How much the price moved since a second ago, with the percent.') + g('Since open', 'Change since the market opened.') + g('Volume', 'Total money traded in this company.') + g('Net buying', 'Money bought minus money sold this year. Positive means more buyers.') + g('Candle', 'One bar of the price chart: the box runs from the open to the close, the thin line shows the high and the low. Green = price rose, red = fell.') + g('Series A / B', 'Funding rounds where investors decide whether to back the company.') + g('IPO', 'Initial public offering: the company lists on the stock market. A big make-or-break moment.') + g('Portfolio value', 'Your cash plus the value of all your shares.') + g('Profit / loss', 'Portfolio value now minus what you started with.') + g('Analyst report', 'A private score for one company. It costs €1,500 and is sharper than the public score.') + g('Liquidity', 'How much money it takes to move a price. Low liquidity means your trade moves it more.') + '</div></div></div>';
}
function fiTop(i, pub, tk, priv, isHost, ctx) {
  const d = DC.ALL[i], f = tk.fi[i - DC.NP], P = pub.P[i], pp = pub.pp ? pub.pp[i] : P, so = P / 100 - 1, bond = f.kind === 'bond';
  let h = '<div class="ph"><div><h2 style="padding:0;border:0">' + d.code + ' · ' + esc(d.name) + '</h2><div class="small muted">' + esc(f.line) + '</div></div><span class="spacer"></span><span class="chip">' + (bond ? 'Bond' : 'Index fund') + '</span></div><div class="pb">';
  h += '<div class="row" style="align-items:baseline;gap:12px"><b class="mono bigpx' + flashCls('d' + i, P) + '">€' + px(P) + '</b>' + chgHTML(P, pp) + '<span class="spacer"></span><span class="small ' + cls(so) + ' mono">since open ' + pct(so, 1) + '</span></div>';
  h += candleBlock(i, { tf: ctx.tf, bars: ctx.bars[i], cur: pub.cb && pub.ph !== 'prep' ? pub.cb[i] : null, curY: Math.min(pub.t + 1, pub.T), tk: tk, last: P });
  h += '<div class="facts">' + (bond ? '<div class="fact"><span>Yearly coupon</span><b>€' + (f.cpn * 100).toFixed(0) + ' per unit (' + Math.round(f.cpn * 100) + '%)</b></div><div class="fact"><span>Paid out</span><b>Every year end, in cash</b></div><div class="fact"><span>Repaid at the end</span><b>€100 per unit</b></div><div class="fact"><span>Price falls when</span><b>' + (i === DC.NP ? 'interest rates rise' : 'rates rise or investors panic') + '</b></div>'
    : '<div class="fact"><span>What it holds</span><b>All 12 companies, equal parts</b></div><div class="fact"><span>Pays coupons</span><b>No</b></div><div class="fact"><span>Failed company</span><b>Index loses 1/12 of its weight</b></div><div class="fact"><span>Price impact</span><b>None, you trade at the index value</b></div>') +
    '<div class="fact"><span>Fee</span><b>' + (tk.fee * 40).toFixed(1) + '% per trade</b></div></div>';
  return h + '</div>';
}
function annHTML(pub, open, now) { // dropdown shown during a frozen break: major news of the year just finished
  const items = pub.mj || [], left = mmss(pub.bk - now);
  const head = '<button class="annh" data-act="ann"><span>📣 <b>' + (items.length ? 'Year ' + pub.t + ' results · ' + items.length + ' major news' : 'Planning break') + '</b></span><span>Next year in <b class="mono">' + left + '</b> ' + (open ? '▴' : '▾') + '</span></button>';
  const body = open ? '<div class="annb">' + items.map(x => '<div class="ai ' + x.k + '"' + (x.c >= 0 ? ' data-act="goto" data-i="' + x.c + '"' : '') + '><i>' + (x.ty ? NIC[x.ty][0] : x.k === 'ok' ? '✓' : x.k === 'bad' ? '✗' : '⚡') + '</i><span>' + esc(x.x) + '</span></div>').join('') + '<p class="small muted" style="margin:8px 0 0">Prices are frozen and trading is closed. Check your portfolio and plan your next move.' + (items.some(x => x.c >= 0) ? ' Tap a headline to open the company.' : '') + '</p></div>' : '';
  return '<div class="wrap"><div class="ann">' + head + body + '</div></div>';
}
function renderTicker() {
  const t = $('#ticker'); if (!t) return; const items = C.news.slice(0, window.innerWidth <= 560 ? 2 : 3), fresh = Date.now() - C.lastNews < 9000;
  const html = items.length ? '<div class="wrap"><div class="tick">' + items.map((x, k) => '<div class="ti' + (k === 0 && fresh ? ' new' : '') + '"' + (x.c >= 0 ? ' data-act="goto" data-i="' + x.c + '"' : '') + '><span class="t">' + (k === 0 ? 'NEWS' : 'Y' + x.t) + '</span>' + nIcon(x) + esc(x.x) + '</div>').join('') + '</div></div>' : '';
  if (t.dataset.k !== html) { t.innerHTML = html; t.dataset.k = html; }
}
function renderClient(force) {
  const pub = C.pub, tk = C.tk, body = $('#cbody'); if (!body) return;
  refreshView(); updateTape($('#mq'), C.pub, C.tk);
  if (pub) SFX.watch({ ph: pub.ph, t: pub.t, bk: pub.bk || 0, mj: pub.mj || [], news: pub.nw || [], now: nowHost() });
  if (C.denied) { body.innerHTML = '<div class="panel"><div class="pb"><h2>This name is already in use in this room</h2><p>Open the join link again and pick a different name, or clear this site’s data.</p></div></div>'; return; }
  const stale = pub && pub.ph !== 'end' && Date.now() - C.lastPubAt > 9000;
  if (!pub || !tk || !C.priv) { $('#banner').innerHTML = ''; body.innerHTML = '<div class="panel"><div class="pb"><h2>Connecting…</h2><p class="muted">' + (C.st === 'up' ? 'Connected to the relay. Waiting for the host to answer.' : C.st === 'err' ? 'The relay is not reachable from this network. Try another network, such as mobile data.' : 'Reaching the relay.') + '</p><button class="btn pri" data-act="reconnect">Reconnect now</button></div></div>'; body.dataset.k = ''; return; }
  const ph = pub.ph;
  if (C.phSeen !== ph) {
    if (C.phSeen === 'prep' && ph === 'run') { toast('The market is open. Good luck!'); if (C.tab === 'guide') C.tab = 'market'; C.sel = C.sel; }
    if (ph === 'end') C.tab = 'results'; if (C.phSeen == null && ph === 'run') C.tab = 'market'; if (C.phSeen == null && ph === 'end') C.tab = 'results';
    C.phSeen = ph; $('#ctabs').dataset.k = ''; body.dataset.k = ''; C.dirty = true; force = true;
  }
  const TB = tabsFor(ph); if (!TB.some(t => t[0] === C.tab)) { C.tab = TB[0][0]; }
  const tsig = C.tab + '|' + ph;
  if ($('#ctabs').dataset.k !== tsig) { $('#ctabs').innerHTML = TB.map(t => '<button class="tab' + (C.tab === t[0] ? ' on' : '') + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>').join(''); $('#ctabs').dataset.k = tsig; $('#cnav').innerHTML = TB.map(t => '<button class="' + (C.tab === t[0] ? 'on' : '') + '" data-act="tab" data-t="' + t[0] + '"><i>' + t[2] + '</i>' + t[1] + '</button>').join(''); }
  // banner: practice mode or connection warning
  let bn = (stale || (C.st !== 'up' && pub.ph !== 'end')) ? '<div class="wrap"><div class="note warn conn-warn"><span>Connection lost. Your data may be out of date.</span><button class="btn pri sm" data-act="reconnect">Reconnect</button></div></div>' : '';
  if (ph === 'prep') bn += '<div class="wrap"><div class="prac"><div><b>PRACTICE MODE</b> · prices are frozen and nothing you do counts. Try buying and selling, open a company, read the guide. <span class="faint">' + pub.rc + ' of ' + pub.hc + ' ready</span></div><div class="row"><button class="btn sm" data-act="prreset">Reset practice</button><button class="btn pri sm" data-act="rdy">' + (C.rdy ? '✓ Ready (tap to undo)' : 'I’m ready') + '</button></div></div></div>';
  else if (ph === 'pause' && pub.bk) { if (C.annT !== pub.t) { C.annT = pub.t; C.annOpen = true; } bn += annHTML(pub, C.annOpen, nowHost()); }
  if ($('#banner').dataset.k !== bn) { $('#banner').innerHTML = bn; $('#banner').dataset.k = bn; }
  renderTicker();
  // header
  const left = ph === 'run' ? Math.max(0, pub.te - nowHost()) : ph === 'pause' ? tk.pz : 0;
  $('#ck').textContent = ph === 'prep' ? 'Practice · waiting for host' : ph === 'end' ? 'Game over' : ph === 'pause' && pub.bk ? (pub.mj && pub.mj.length ? 'Major news · ' : 'Planning break · ') + mmss(pub.bk - nowHost()) : (ph === 'pause' ? 'PAUSED · ' : '') + 'Year ' + Math.min(pub.t + 1, pub.T) + ' / ' + pub.T + ' · ' + mmss(left);
  $('#cb').style.width = (ph === 'end' ? 100 : ph === 'prep' ? 0 : 100 - left / ((pub.yl || tk.tickSec || 75) * 1000) * 100) + '%';
  const nw = liveNW(), pv = prevNW(), P = PV(); $('#kNW').textContent = eurK(nw); $('#kNW').className = cls(nw - tk.cash0); $('#kCash').textContent = eurK(C.priv.cash);
  const dn = nw - pv; $('#kNWc').innerHTML = ph === 'run' && Math.abs(dn) >= 1 ? '<span class="' + cls(dn) + '">' + arrow(dn) + ' ' + eurK(Math.abs(dn)) + '</span>' : 'Portfolio';
  const rk = 1 + pub.w.filter(w => w > Math.round(nw / 100) * 100 + 50).length; $('#kRank').textContent = ph === 'prep' ? '—' : '#' + rk + '/' + pub.cnt;
  // my current-year candle (portfolio value)
  const cy = Math.min(pub.t + 1, pub.T);
  if (ph !== 'prep') { const nwc = C.priv.nwc || []; if (C.ncY !== cy) { const o = nwc.length ? nwc[nwc.length - 1][3] : tk.cash0; C.nc = [o, Math.max(o, nw), Math.min(o, nw), nw]; C.ncY = cy; } else { C.nc[3] = nw; if (nw > C.nc[1]) C.nc[1] = nw; if (nw < C.nc[2]) C.nc[2] = nw; } }
  const sig = C.tab + '|' + (C.sel == null ? 'x' : C.sel) + '|' + window.innerWidth + '|' + ph + '|' + C.tf;
  const need = force || C.dirty || body.dataset.k !== sig; if (!need) { ticketUpdate(); return; }
  C.dirty = false;
  if (C.tab === 'market') {
    const narrow = window.innerWidth <= 900;
    if (body.dataset.k !== sig) {
      const only = narrow && C.sel != null;
      body.innerHTML = only ? '<div class="panel" id="cDt"></div>' : '<div class="cols"><div class="panel"><h2>Market <span class="small faint hm">tap a company</span><span class="spacer"></span><span class="small faint" style="white-space:nowrap"><span class="hd h1c"></span>low <span class="hd h2c"></span>med <span class="hd h3c"></span>high risk</span></h2><div id="cMk"></div></div><div class="panel" id="cDt"></div></div>';
      body.dataset.k = sig; C.rebuiltDt = true;
    }
    if ($('#cMk')) $('#cMk').innerHTML = marketTable(P, tk, { priv: C.priv, sel: C.sel, key: 'c' });
    const dt = $('#cDt');
    if (C.sel == null) { if (!narrow) dt.innerHTML = '<div class="pb"><h2>Pick a company</h2><p class="muted">Each company is a young business that needs funding. Read its cash, news and next event, then buy or sell. Every trade moves the price for everybody.</p><div class="note"><b>The rules in short.</b> Prices change every second with trading and news. At each funding round and at the IPO a company either passes and its price jumps, or fails and loses almost everything. At the end every survivor is paid out at its real value. You may hold at most ' + Math.round(tk.maxExp * 100) + '% of your portfolio in one company.</div></div>'; else dt.innerHTML = ''; }
    else {
      const i = C.sel; if (C.rebuiltDt || !$('#dtTop')) { dt.innerHTML = (narrow ? '<div class="ph"><button class="btn sm" data-act="back">← Market</button></div>' : '') + '<div id="dtTop"></div><div class="pb" style="padding-top:0"><div id="dtTkt">' + ticketHTML(i) + '</div><div id="dtVal">' + valHTML(i, P, tk, C.priv) + '</div></div>'; C.rebuiltDt = false; }
      $('#dtTop').innerHTML = (i >= DC.NP ? fiTop : detailTop)(i, P, tk, C.priv, false, { tf: C.tf, bars: C.bars }); valUpdate(i); ticketUpdate();
    }
  } else if (C.tab === 'port') { body.innerHTML = portHTML(P, tk); body.dataset.k = sig; }
  else if (C.tab === 'news') { body.innerHTML = '<div class="cols"><div class="panel"><h2>Headlines ' + NLEG_BTN + ' <span class="small faint">tap one to open the company</span></h2><div class="pb">' + newsFeed(C.news, 40) + '</div></div><div class="panel"><h2>Live trades from the whole class</h2><div class="pb">' + tapeFeed(pub) + '</div></div></div>'; body.dataset.k = sig; }
  else if (C.tab === 'board') { body.innerHTML = '<div class="panel"><h2>Leaderboard <span class="small faint">at current prices</span></h2><div class="pb">' + leaderTable(pub.top, C.me.name) + '<p class="small muted" style="margin-top:8px">You are #' + rk + ' of ' + pub.cnt + '.</p></div></div>'; body.dataset.k = sig; }
  else if (C.tab === 'guide') { body.innerHTML = guideHTML(); body.dataset.k = sig; }
  else if (C.tab === 'results') { body.innerHTML = resultsHTML(tk, C.me.name, C.openP) + debriefHTML(tk.db); body.dataset.k = sig; }
}
function portHTML(pub, tk) {
  const p = C.priv, nw = liveNW(), pv = prevNW(); let rows = '', invested = 0; const hz = [0, 0, 0, 0];
  for (let i = 0; i < DC.NA; i++) { const s = p.hold[i]; if (!s) continue; const v = s * pub.P[i], d = DC.ALL[i], pl = v - p.cost[i]; invested += v; hz[(d.h || 4) - 1] += v; const pp = pub.pp ? pub.pp[i] : pub.P[i]; rows += '<tr class="mk" data-i="' + i + '" data-act="goto"><td><span class="pn">' + (d.h ? '<span class="hd h' + d.h + 'c"></span>' : '') + d.code + '</span><span class="ps">' + s + (i >= DC.NP ? ' units' : ' shares') + '</span></td><td>' + eurK(v) + '</td><td class="hm">' + px(p.cost[i] / s) + '</td><td class="pxc">' + px(pub.P[i]) + '<br>' + chgHTML(pub.P[i], pp) + '</td><td class="' + cls(pl) + '">' + eurS(pl) + '<span class="ps">' + pct(p.cost[i] ? v / p.cost[i] - 1 : 0, 1) + '</span></td><td class="hm">' + Math.round(v / nw * 100) + '%</td></tr>'; }
  const cs = []; const nwc = p.nwc || [];
  nwc.forEach((c, k) => cs.push({ o: c[0], h: c[1], l: c[2], c: c[3], lab: 'Year ' + (k + 1) }));
  if (pub.ph === 'run' || pub.ph === 'pause') cs.push({ o: C.nc[0], h: C.nc[1], l: C.nc[2], c: C.nc[3], live: true, lab: 'This year' });
  const xl = cs.map((c, k) => [k, String(k + 1)]);
  let h = '<div class="cols"><div style="display:grid;gap:14px"><div class="panel"><h2>Portfolio value</h2><div class="pb"><div class="row" style="align-items:baseline;gap:10px"><b class="mono bigpx">' + eur(nw) + '</b><span class="' + cls(nw - tk.cash0) + ' mono">' + eurS(nw - tk.cash0) + ' (' + pct(nw / tk.cash0 - 1, 1) + ')</span>' + (pub.ph === 'run' ? '<span class="chg ' + cls(nw - pv) + '">' + arrow(nw - pv) + ' ' + eur(Math.abs(nw - pv)) + '</span>' : '') + '</div>' + candleChart({ cs: cs, xl: xl, hline: tk.cash0, slots: tk.T, w: 380, h: 160, minRange: tk.cash0 * 0.05, yfmt: v => (v / 1000).toFixed(1) + 'k', label: 'portfolio value by year' }) + '<p class="small muted">One candle per year. Dotted line = your starting €' + (tk.cash0 / 1000) + 'k. Cash ' + eur(p.cash) + ' · shares ' + eur(invested) + ' · trades ' + p.tr + '</p></div></div>' +
    '<div class="panel"><h2>Mix by risk class</h2><div class="pb">' + stackBar([{ v: hz[0], c: 'var(--h1)', l: 'Low risk' }, { v: hz[1], c: 'var(--h2)', l: 'Medium risk' }, { v: hz[2], c: 'var(--h3)', l: 'High risk' }, { v: hz[3], c: 'var(--ink3)', l: 'Bonds & index' }, { v: p.cash, c: 'var(--line)', l: 'Cash' }]) + '<p class="small muted" style="margin-top:8px">A common rule of thumb for innovation: roughly 70% low risk, 20% medium, 10% high.' + (p.cp ? ' Bond coupons received so far: <b>' + eur(p.cp) + '</b>.' : '') + '</p></div></div></div>' +
    '<div class="panel"><h2>Your shares</h2>' + (rows ? '<table><thead><tr><th>Company</th><th>Value</th><th class="hm">Avg cost</th><th>Price</th><th>Profit / loss</th><th class="hm">Weight</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="pb"><p class="muted">No shares yet. Open the Market tab and buy your first company.</p></div>') + '</div></div>';
  return h;
}
function clientClick(e) {
  const t = e.target.closest('[data-act],tr.mk'); if (!t) return;
  const a = t.dataset.act;
  if (t.matches('tr.mk') && !a) { C.sel = +t.dataset.i; C.tab = 'market'; C.rebuiltDt = true; C.dirty = true; $('#cbody').dataset.k = ''; renderClient(true); window.scrollTo(0, 0); return; }
  if (a === 'goto') { C.sel = +t.dataset.i; C.tab = 'market'; C.rebuiltDt = true; C.dirty = true; $('#cbody').dataset.k = ''; $('#ctabs').dataset.k = ''; renderClient(true); window.scrollTo(0, 0); return; }
  if (a === 'tab') { C.tab = t.dataset.t; $('#ctabs').dataset.k = ''; $('#cbody').dataset.k = ''; C.dirty = true; renderClient(true); return; }
  if (a === 'back') { C.sel = null; $('#cbody').dataset.k = ''; C.dirty = true; renderClient(true); return; }
  if (a === 'reconnect') { clientReconnect(true); return; }
  if (a === 'ann') { C.annOpen = !C.annOpen; $('#banner').dataset.k = ''; renderClient(true); return; }
  if (a === 'tf') { C.tf = t.dataset.m; C.dirty = true; renderClient(true); return; }
  if (a === 'px') { const k = +t.dataset.k; if (C.openP.has(k)) C.openP.delete(k); else C.openP.add(k); C.dirty = true; renderClient(true); return; }
  if (a === 'rdy') { C.rdy = !C.rdy; C.rdyAt = Date.now(); C.net.send('a', { k: 'rd', id: C.me.id, tok: C.me.tok, v: C.rdy ? 1 : 0 }, 1); C.dirty = true; renderClient(true); return; }
  if (a === 'prreset') { C.prac = pracNew(); refreshView(); C.dirty = true; toast('Practice account reset'); renderClient(true); return; }
  if (a === 'side') { C.side = t.dataset.s; $('#dtTkt').innerHTML = ticketHTML(C.sel); ticketUpdate(); return; }
  if (a === 'amt') { C.amt = t.dataset.a === 'max' ? 'max' : +t.dataset.a; $('#dtTkt').innerHTML = ticketHTML(C.sel); ticketUpdate(); return; }
  if (a === 'frac') { C.sell = +t.dataset.f; $('#dtTkt').innerHTML = ticketHTML(C.sel); ticketUpdate(); return; }
  if (a === 'dd') { sendAct({ k: 'd', p: +t.dataset.i }); return; }
  if (a === 'exec') { const i = C.sel, r = quoteState(i); if (!r.ok) return; sendAct({ k: C.side === 'buy' ? 'b' : 's', p: i, s: r.S }); return; }
}
function clientInput(e) {
  if (e.target.id === 'tcu') { C.amt = 'cust'; C.custom = +e.target.value || 0; $$('#dtTkt .amts .btn').forEach(b => b.classList.remove('on')); ticketUpdate(); }
  else if (e.target.id === 'vq') valUpdate(C.sel);
}

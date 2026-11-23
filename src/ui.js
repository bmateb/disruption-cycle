/* shared UI helpers */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => (n < 0 ? '-' : '') + '€' + Math.round(Math.abs(n)).toLocaleString('en-US');
const eurK = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; return a >= 1e6 ? s + '€' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? s + '€' + (a / 1e3).toFixed(0) + 'k' : a >= 1e3 ? s + '€' + (a / 1e3).toFixed(1) + 'k' : s + '€' + Math.round(a); };
const pct = (x, d) => (x >= 0 ? '+' : '') + (x * 100).toFixed(d == null ? 1 : d) + '%';
const px = v => v.toFixed(2);
const eurS = n => (n >= 0 ? '+' : '-') + eurK(Math.abs(n));
const RISK = { 1: 'Low risk', 2: 'Medium risk', 3: 'High risk' };
const EVS = ['Series A', 'Series B', 'IPO'];
const HN = { 1: 'Core', 2: 'Adjacent', 3: 'Breakthrough' };
const cls = x => x > 0.00005 ? 'up' : x < -0.00005 ? 'dn' : '';
const arrow = x => x > 0.00005 ? '▲' : x < -0.00005 ? '▼' : '▬';
function mmss(ms) { ms = Math.max(0, Math.round(ms / 1000)); return Math.floor(ms / 60) + ':' + String(ms % 60).padStart(2, '0'); }
function toast(msg, bad) {
  let t = $('#toast'); if (t) t.remove();
  t = document.createElement('div'); t.id = 'toast'; t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); clearTimeout(toast._t); toast._t = setTimeout(() => t.remove(), bad ? 3800 : 2400);
}
const hcol = h => 'var(--h' + h + ')';

/* ---------- price change display ---------- */
function chgHTML(P, pp, o) { // arrow, amount and percent versus the previous second
  const d = P - pp, r = pp ? P / pp - 1 : 0, c = cls(Math.abs(d) < 0.005 ? 0 : d);
  return '<span class="chg ' + c + '">' + (c ? arrow(d) : '▬') + ' ' + (d >= 0 ? '+' : '-') + Math.abs(d).toFixed(2) + ' <span class="chp">(' + pct(r, 2) + ')</span></span>';
}
const FLASH = {};
function flashCls(key, v) { const prev = FLASH[key]; FLASH[key] = v; return prev == null || prev === v ? '' : (v > prev ? ' fu' : ' fd'); }

/* ---------- candlestick charts ---------- */
function candleChart(o) { // o.cs [{o,h,l,c,lab}], o.slots, o.marks [{i,label,ok}], o.xl [[i,label]], o.hline, o.last
  const w = o.w || 380, h = o.h || 170, L = 40, R = 46, Tp = 8, B = 20, cs = o.cs || [];
  if (!cs.length) return '<div class="nochart" style="height:' + h + 'px">Chart appears when the market opens</div>';
  let mn = Infinity, mx = -Infinity; cs.forEach(c => { if (c.l < mn) mn = c.l; if (c.h > mx) mx = c.h; });
  if (o.hline != null) { mn = Math.min(mn, o.hline); mx = Math.max(mx, o.hline); }
  const pad = (mx - mn) * 0.08 || mx * 0.01 || 1; mn -= pad; mx += pad; if (o.minRange && mx - mn < o.minRange) { const m = (mx + mn) / 2; mn = m - o.minRange / 2; mx = m + o.minRange / 2; } if (o.floor0 && mn < 0) mn = 0;
  const rg = mx - mn, dec = o.dec != null ? o.dec : rg < 0.8 ? 3 : rg < 8 ? 2 : rg < 80 ? 1 : 0;
  const yf = o.yfmt ? o.yfmt : (v => v.toFixed(dec));
  const slots = Math.max(o.slots || cs.length, cs.length), pw = w - L - R, sl = pw / slots, bw = Math.max(1.6, Math.min(16, sl * 0.62));
  const X = i => L + sl * (i + 0.5), Y = v => Tp + (h - Tp - B) * (1 - (v - mn) / (mx - mn));
  let s = '<svg class="ch" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.label || 'candlestick chart') + '">';
  for (let k = 0; k <= 4; k++) { const v = mn + rg * k / 4, y = Y(v); s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 5) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--ink3)" font-family="var(--ff-mono)">' + yf(v) + '</text>'; }
  (o.xl || []).forEach(m => { s += '<text x="' + X(m[0]).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9.5" fill="var(--ink3)" font-family="var(--ff-mono)">' + esc(m[1]) + '</text>'; });
  if (o.hline != null) { const y = Y(o.hline); s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--ink3)" stroke-dasharray="2 3"/>'; }
  (o.marks || []).forEach(m => { const x = X(m.i) + sl / 2; const col = m.ok === false ? 'var(--bad)' : m.ok ? 'var(--good)' : 'var(--ink3)'; s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Tp + '" y2="' + (h - B) + '" stroke="' + col + '" stroke-dasharray="3 3" stroke-width="1"/><text x="' + Math.min(x, w - R - 14).toFixed(1) + '" y="' + (Tp + 9) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="' + col + '" font-family="var(--ff-mono)">' + esc(m.label) + '</text>'; });
  cs.forEach((c, i) => {
    const x = X(i), up = c.c >= c.o, col = c.c === c.o ? 'var(--ink3)' : up ? 'var(--good)' : 'var(--bad)';
    const yo = Y(c.o), yc = Y(c.c), top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yo - yc));
    s += '<g><title>' + esc((c.lab || '') + '  open ' + c.o.toFixed(2) + '  high ' + c.h.toFixed(2) + '  low ' + c.l.toFixed(2) + '  close ' + c.c.toFixed(2)) + '</title><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(c.h).toFixed(1) + '" y2="' + Y(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/><rect x="' + (x - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + col + '"' + (c.live ? ' fill-opacity=".55" stroke="' + col + '"' : '') + '/></g>';
  });
  const lv = o.last != null ? o.last : cs[cs.length - 1].c, ly = Y(lv), lc = cs[cs.length - 1].c >= cs[cs.length - 1].o ? 'var(--good)' : 'var(--bad)';
  s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + ly.toFixed(1) + '" y2="' + ly.toFixed(1) + '" stroke="' + lc + '" stroke-width=".8" stroke-dasharray="1 3"/><rect x="' + (w - R + 2) + '" y="' + (ly - 8).toFixed(1) + '" width="' + (R - 3) + '" height="16" rx="3" fill="' + lc + '"/><text x="' + (w - R + 2 + (R - 3) / 2) + '" y="' + (ly + 3.8).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="var(--ff-mono)">' + yf(lv) + '</text>';
  return s + '</svg>';
}
/* turns 5-second bars into drawable candles; mode 'live' = latest bars, 'year' = one candle per year */
function buildCandles(bars, cur, curY, mode, gl, slotsMax) {
  const marks = [], xl = []; let cs = [];
  const tag = g => (g.k || '') + (g.ok ? ' ✓' : ' ✗');
  if (mode === 'year') {
    const m = new Map(), add = (y, o, h, l, c, lv) => { const x = m.get(y); if (!x) m.set(y, { o: o, h: h, l: l, c: c, y: y, live: lv }); else { x.h = Math.max(x.h, h); x.l = Math.min(x.l, l); x.c = c; if (lv) x.live = true; } };
    bars.forEach(b => add(b[5], b[1], b[2], b[3], b[4], false));
    if (cur) add(curY, cur[0], cur[1], cur[2], cur[3], true);
    const ys = Array.from(m.keys()).sort((a, b) => a - b); cs = ys.map(y => { const c = m.get(y); c.lab = 'Year ' + y; return c; });
    cs.forEach((c, i) => xl.push([i, String(c.y)]));
    (gl || []).forEach(g => { const i = ys.indexOf(g.t); if (i >= 0) marks.push({ i: i, label: tag(g), ok: g.ok }); });
  } else {
    const n = slotsMax || 48;
    cs = bars.slice(-(n - 1)).map(b => ({ o: b[1], h: b[2], l: b[3], c: b[4], y: b[5], lab: 'Year ' + b[5] }));
    if (cur) cs.push({ o: cur[0], h: cur[1], l: cur[2], c: cur[3], y: curY, live: true, lab: 'Now' });
    let prevY = null; cs.forEach((c, i) => { if (c.y !== prevY) { xl.push([i, 'Y' + c.y]); prevY = c.y; } });
    (gl || []).forEach(g => { let idx = -1; cs.forEach((c, i) => { if (c.y === g.t && !c.live) idx = i; }); if (idx >= 0) marks.push({ i: idx, label: tag(g), ok: g.ok }); });
  }
  return { cs: cs, marks: marks, xl: xl };
}
function sparkline(vals, w, h, col) {
  if (!vals || vals.length < 2) return '';
  w = w || 90; h = h || 26; const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = mx - mn || 1;
  let d = vals.map((v, i) => (i ? 'L' : 'M') + (i / (vals.length - 1) * (w - 4) + 2).toFixed(1) + ' ' + (h - 3 - (h - 6) * (v - mn) / r).toFixed(1)).join('');
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + (col || 'var(--brand)') + '" stroke-width="1.8" stroke-linejoin="round"/></svg>';
}
function stackBar(parts) { // [{v,c,l}]
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  return '<div class="bar-stack" role="img" aria-label="' + parts.map(p => p.l + ' ' + Math.round(p.v / tot * 100) + '%').join(', ') + '">' + parts.map(p => '<i style="width:' + (p.v / tot * 100).toFixed(1) + '%;background:' + p.c + '"></i>').join('') + '</div><div class="legend">' + parts.map(p => '<span><span class="hd" style="background:' + p.c + '"></span>' + esc(p.l) + ' ' + Math.round(p.v / tot * 100) + '%</span>').join('') + '</div>';
}

/* ---------- market table ---------- */
function projLabel(i, tk) {
  if (i >= DC.NP) return { t: DC.ALL[i].kind === 'bond' ? 'Bond' : 'Index fund', c: '' };
  const q = tk.pr[i];
  if (q.st === 'dead') return { t: 'Failed', c: 'bad' };
  if (q.st === 'sold') return { t: 'Acquired', c: 'good' };
  if (q.st === 'exit') return { t: 'Paid out', c: 'good' };
  return { t: DC.STAGES[q.stage], c: '' };
}
function nextEv(q) { return q.gate != null && q.st === 'live' ? EVS[q.gi] + ' · Y' + q.gate : '—'; }
function marketTable(pub, tk, o) {
  o = o || {}; const key = o.key || 'm';
  let h = '<table class="mt"><thead><tr><th>Company</th><th>Price €</th><th>Change</th><th class="hm">Since open</th><th class="hm">Next event</th>' + (o.priv ? '<th>My shares</th>' : '') + '</tr></thead><tbody>';
  for (let i = 0; i < DC.NP; i++) {
    const d = DC.PROJ[i], q = tk.pr[i], P = pub.P[i], pp = pub.pp ? pub.pp[i] : P, open = q.ph[0] || P, so = P / open - 1;
    const lab = projLabel(i, tk), fl = pub.fl[i], live = q.st === 'live';
    const mine = o.priv ? o.priv.hold[i] : 0;
    h += '<tr class="mk' + (o.sel === i ? ' sel' : '') + (live ? '' : ' dead') + '" data-i="' + i + '"><td><span class="pn"><span class="hd h' + d.h + 'c"></span>' + d.code + ' <span class="faint" style="font-weight:500">' + esc(d.name) + '</span></span><span class="ps"><span class="chip ' + lab.c + '">' + lab.t + '</span></span></td>' +
      '<td class="pxc' + (live ? flashCls(key + i, P) : '') + '"><b>' + px(P) + '</b></td><td>' + (live ? chgHTML(P, pp) : '') + '</td>' +
      '<td class="hm ' + cls(so) + '">' + pct(so, 1) + '</td>' +
      
      (o.priv ? '<td>' + (mine ? '<b>' + mine + '</b><span class="ps">' + eurK(mine * P) + '</span>' : '<span class="faint">—</span>') + '</td>' : '') + '</tr>';
  }
  h += '</tbody></table>';
  h += '<div class="fihd">Bonds and index fund <span class="small faint">fair price, no price impact · bonds pay a yearly coupon</span></div><table class="mt fit"><tbody>';
  for (let i = DC.NP; i < DC.NA; i++) {
    const d = DC.ALL[i], f = tk.fi[i - DC.NP], P = pub.P[i], pp = pub.pp ? pub.pp[i] : P, so = P / 100 - 1, mine = o.priv ? o.priv.hold[i] : 0, live = f.st === 'live';
    h += '<tr class="' + (o.priv ? 'mk' : '') + (o.sel === i ? ' sel' : '') + '" data-i="' + i + '"><td><span class="pn">' + d.code + ' <span class="faint" style="font-weight:500">' + esc(d.name) + '</span></span><span class="ps"><span class="chip">' + (f.kind === 'bond' ? 'Pays ' + Math.round(f.cpn * 100) + '% a year' : 'All 12 companies') + '</span></span></td>' +
      '<td class="pxc' + (live ? flashCls(key + i, P) : '') + '"><b>' + px(P) + '</b></td><td>' + (live ? chgHTML(P, pp) : '') + '</td><td class="hm ' + cls(so) + '">' + pct(so, 1) + '</td><td class="hm"></td>' +
      (o.priv ? '<td>' + (mine ? '<b>' + mine + '</b><span class="ps">' + eurK(mine * P) + '</span>' : '<span class="faint">—</span>') + '</td>' : '') + '</tr>';
  }
  return h + '</tbody></table>';
}
function newsFeed(items, n) {
  return '<div class="feed">' + (items.length ? items.slice(0, n || 12).map(x => '<div' + (x.c >= 0 ? ' class="nl" data-act="goto" data-i="' + x.c + '"' : '') + '><span class="t">Y' + x.t + '</span>' + esc(x.x) + '</div>').join('') : '<div class="faint">No news yet.</div>') + '</div>';
}
function tapeFeed(pub) { return '<div class="feed">' + (pub.tape.length ? pub.tape.map(e => '<div><span class="t">Y' + e.t + '</span><b>' + esc(e.n) + '</b> <span class="' + (e.s === 'B' ? 'up' : 'dn') + '">' + (e.s === 'B' ? 'bought' : 'sold') + '</span> ' + e.q + ' <b>' + e.c + '</b> @ ' + px(e.p) + '</div>').join('') : '<div class="faint">No trades yet.</div>') + '</div>'; }
function leaderTable(top, me) {
  return '<table class="tbl-sm"><thead><tr><th>#</th><th style="text-align:left">Investor</th><th>Portfolio</th><th>Profit / loss</th></tr></thead><tbody>' + top.map((x, i) => '<tr' + (me && x[0] === me ? ' style="font-weight:700"' : '') + '><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x[0]) + (x[2] ? ' <span class="chip">bot</span>' : '') + '</td><td>' + eurK(x[1]) + '</td><td class="' + cls(x[1] - 100000) + '">' + pct(x[1] / 100000 - 1, 1) + '</td></tr>').join('') + '</tbody></table>';
}

/* ---------- final results: every player, result and full portfolio ---------- */
function resultsHTML(tk, me, open, stub) {
  const fin = tk.fin; if (!fin) return ''; const c0 = tk.cash0;
  const medal = ['🥇', '🥈', '🥉'];
  const tot = fin.reduce((a, x) => a + x.w, 0), avg = tot / fin.length, wins = fin.filter(x => x.w > c0).length;
  const mi = fin.findIndex(x => x.n === me);
  let h = '<div class="panel"><h2>Final results <span class="small faint">' + fin.length + ' investors · everyone started with ' + eur(c0) + '</span></h2><div class="pb">';
  h += '<div class="podium">' + fin.slice(0, 3).map((x, i) => '<div class="pod p' + i + '"><div class="pm">' + medal[i] + '</div><b>' + esc(x.n) + '</b><span class="mono">' + eur(x.w) + '</span><span class="' + cls(x.w - c0) + ' mono">' + eurS(x.w - c0) + ' (' + pct(x.w / c0 - 1, 1) + ')</span></div>').join('') + '</div>';
  if (mi >= 0) h += '<div class="note" style="margin-top:12px"><b>Your result:</b> rank ' + (mi + 1) + ' of ' + fin.length + ' · ' + eur(fin[mi].w) + ' · <b class="' + cls(fin[mi].w - c0) + '">' + eurS(fin[mi].w - c0) + ' (' + pct(fin[mi].w / c0 - 1, 1) + ')</b></div>';
  h += '<p class="small muted" style="margin:10px 0">Class average ' + eur(avg) + ' (' + pct(avg / c0 - 1, 1) + '). ' + wins + ' of ' + fin.length + ' investors finished in profit. Tap a row to see that investor’s full portfolio.</p>';
  h += '<table class="rt"><thead><tr><th>#</th><th>Investor</th><th>Final value</th><th>Profit / loss</th><th>Return</th><th class="hm">Trades</th><th></th></tr></thead><tbody>';
  fin.forEach((x, k) => {
    const pl = x.w - c0, isOpen = open && open.has(k);
    h += '<tr class="rr' + (x.n === me ? ' me' : '') + '" data-act="px" data-k="' + k + '"><td>' + (k + 1) + '</td><td style="text-align:left"><b>' + esc(x.n) + '</b>' + (x.b ? ' <span class="chip">bot</span>' : '') + '</td><td>' + eur(x.w) + '</td><td class="' + cls(pl) + '">' + eurS(pl) + '</td><td class="' + cls(pl) + '">' + pct(x.w / c0 - 1, 1) + '</td><td class="hm">' + x.tr + '</td><td class="chev">' + (isOpen ? '▾' : '▸') + '</td></tr>';
    if (isOpen) {
      h += '<tr class="rd"><td colspan="7"><table class="tbl-sm"><thead><tr><th style="text-align:left">Holding</th><th>Shares</th><th>Value</th><th>Profit / loss</th></tr></thead><tbody>' +
        x.h.map(r => { const d = DC.ALL[r[0]], lab = projLabel(r[0], tk); return '<tr><td style="text-align:left">' + (d.h ? '<span class="hd h' + d.h + 'c"></span>' : '') + '<b>' + d.code + '</b> ' + esc(d.name) + ' <span class="chip ' + lab.c + '">' + lab.t + '</span></td><td>' + (r[1] || '—') + '</td><td>' + (r[1] ? eurK(r[2]) : '—') + '</td><td class="' + cls(r[3]) + '">' + eurS(r[3]) + '</td></tr>'; }).join('') +
        '<tr><td style="text-align:left"><b>Cash</b></td><td>—</td><td>' + eurK(x.c) + '</td><td>—</td></tr><tr class="tot"><td style="text-align:left"><b>Total</b></td><td></td><td><b>' + eur(x.w) + '</b></td><td class="' + cls(pl) + '"><b>' + eurS(pl) + '</b></td></tr></tbody></table>' + (x.h.length ? '' : '<p class="small muted" style="padding:6px 8px">This investor never bought a share and kept all cash.</p>') + '</td></tr>';
    }
  });
  return h + '</tbody></table></div></div>';
}
function resultsCSV(tk) {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"', rows = [['Rank', 'Investor', 'Final value EUR', 'Profit/Loss EUR', 'Return %', 'Cash EUR', 'Trades', 'Analyst reports', 'Holdings (shares/value EUR/P&L EUR)'].map(q).join(',')];
  tk.fin.forEach((x, k) => rows.push([k + 1, q(x.n), x.w, x.w - tk.cash0, ((x.w / tk.cash0 - 1) * 100).toFixed(1), x.c, x.tr, x.rp, q(x.h.map(r => DC.ALL[r[0]].code + ' ' + r[1] + '/' + r[2] + '/' + r[3]).join('; '))].join(',')));
  return rows.join('\r\n');
}

/* ---------- debrief ---------- */
function debriefHTML(db) {
  if (!db) return '';
  const P = db.proj, avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const peakOf = p => Math.max.apply(null, p.ph) / p.ph[0], endOf = p => p.ph[p.ph.length - 1] / p.ph[0];
  const dead = P.filter(p => p.st === 'dead'), byH = h => P.filter(p => p.h === h);
  const mini = P.map(p => {
    const cs = p.yc.map((c, i) => ({ o: c[0], h: c[1], l: c[2], c: c[3], lab: 'Year ' + (i + 1) }));
    const marks = p.gl.map(g => ({ i: g.t - 1, label: g.ok ? '✓' : '✗', ok: g.ok })), xl = cs.map((c, i) => [i, String(i + 1)]);
    return '<div class="card" style="padding:8px 10px"><div class="row"><span class="hd h' + p.h + 'c"></span><b>' + p.c + '</b><span class="faint small">' + esc(p.n) + '</span><span class="spacer"></span><span class="chip ' + (p.st === 'dead' ? 'bad' : 'good') + '">' + (p.st === 'dead' ? 'failed' : p.st === 'sold' ? 'acquired' : 'paid out') + '</span></div>' +
      candleChart({ cs: cs, marks: marks, xl: xl, w: 300, h: 130, floor0: true, label: p.n + ' price by year' }) +
      '<div class="small muted">peak ' + peakOf(p).toFixed(2) + '× · end ' + endOf(p).toFixed(2) + '× · hidden quality ' + Math.round(p.q * 100) + ' · money in ' + eurK(p.cls) + '</div></div>';
  }).join('');
  const avgAlloc = [1, 2, 3].map(k => avg(db.alloc.slice(1).map(a => a[k])));
  const bars = db.alloc.map(a => '<div style="flex:1;display:flex;flex-direction:column-reverse;height:110px;min-width:0" title="Year ' + a[0] + '"><i style="height:' + (a[1] * 100) + '%;background:var(--h1)"></i><i style="height:' + (a[2] * 100) + '%;background:var(--h2)"></i><i style="height:' + (a[3] * 100) + '%;background:var(--h3)"></i></div>').join('<span style="width:2px"></span>');
  const maxH = Math.max.apply(null, db.alloc.map(a => a[4]));
  const pk3 = avg(byH(3).map(peakOf)), en3 = avg(byH(3).map(endOf));
  const lost = dead.reduce((a, p) => a + p.cls, 0);
  const lines = [];
  lines.push('<b>Bubble and crash.</b> High-risk (breakthrough) companies peaked at ' + pk3.toFixed(2) + '× their opening price and ended at ' + en3.toFixed(2) + '× (low-risk core: peak ' + avg(byH(1).map(peakOf)).toFixed(2) + '×, end ' + avg(byH(1).map(endOf)).toFixed(2) + '×). Who sold near the peak, and what did they know?');
  lines.push('<b>Staged financing.</b> ' + dead.length + ' of 12 companies failed a funding round or IPO. The class had put ' + eurK(lost) + ' into them. Every round was an option: which investors paid for that option and which spread it?');
  if (db.ddN != null && db.noN != null && db.ddRet != null && db.noRet != null) lines.push('<b>Information.</b> Investors who bought 2 or more analyst reports returned ' + pct(db.ddRet) + ' on average (' + db.ddN + ' people) against ' + pct(db.noRet) + ' for those who bought none (' + db.noN + ' people). ' + eurK(db.ddRev) + ' was spent on reports.');
  if (db.corr != null) lines.push('<b>Diversification.</b> The correlation between the number of different companies a person held and their return was ' + db.corr + '. Spread of outcomes: worst ' + pct(db.q[0], 0) + ', median ' + pct(db.q[2], 0) + ', best ' + pct(db.q[4], 0) + '.');
  lines.push('<b>Portfolio balance.</b> On average the class held ' + Math.round(avgAlloc[0] * 100) + '% core, ' + Math.round(avgAlloc[1] * 100) + '% adjacent and ' + Math.round(avgAlloc[2] * 100) + '% breakthrough, against the 70-20-10 rule. Peak concentration index was ' + maxH.toFixed(2) + ' (equal weights across 12 companies would be 0.08).');
  (db.tips || []).forEach(tp => lines.push('<b>Attention check.</b> The headline “' + esc(tp.x) + '” was a fake tip. ' + (tp.n.length ? tp.n.length + ' of ' + db.humans + ' students ' + (tp.k === 'up' ? 'bought' : 'sold') + ' ' + DC.PROJ[tp.c].name + ' within 45 seconds: ' + tp.n.map(esc).join(', ') + '.' : 'Nobody ' + (tp.k === 'up' ? 'bought' : 'sold') + ' it. Well read!') + ' The price spike faded within a minute; what remained was the money the followers moved.'));
  lines.push('<b>Reflexivity.</b> Capital did not only chase value; it created it. Compare the cash left at each round with the outcome in the charts, then ask: who financed the winners before the news, and who paid for the story after it?');
  return '<div class="panel" style="margin-top:14px"><h2>What happened: prompts for the debrief</h2><div class="pb"><ol style="margin:0;padding-left:20px;display:grid;gap:8px">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ol></div></div>' +
    '<div class="panel" style="margin-top:14px"><h2>Where the class put its capital, by risk class</h2><div class="pb"><div style="display:flex;align-items:stretch;gap:0">' + bars + '</div><div style="display:flex;gap:2px;margin-top:2px">' + db.alloc.map(a => '<span class="faint" style="flex:1;text-align:center;font:500 10px var(--ff-mono)">' + a[0] + '</span>').join('') + '</div><div class="legend"><span><span class="hd h1c"></span>Low risk (core)</span><span><span class="hd h2c"></span>Medium risk (adjacent)</span><span><span class="hd h3c"></span>High risk (breakthrough)</span><span class="faint">Each column is one year, share of invested money.</span></div></div></div>' +
    '<div class="panel" style="margin-top:14px"><h2>Price path of every company</h2><div class="pb"><p class="small muted">One candle per year. Dashed lines mark funding rounds and the IPO: green passed, red failed.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px">' + mini + '</div></div></div>';
}

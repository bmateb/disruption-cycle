/* shared UI helpers */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => (n < 0 ? '-' : '') + '€' + Math.round(Math.abs(n)).toLocaleString('en-US');
const eurK = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; return a >= 1e6 ? s + '€' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? s + '€' + (a / 1e3).toFixed(0) + 'k' : a >= 1e3 ? s + '€' + (a / 1e3).toFixed(1) + 'k' : s + '€' + Math.round(a); };
const pct = (x, d) => (x >= 0 ? '+' : '') + (x * 100).toFixed(d == null ? 1 : d) + '%';
const px = v => (v >= 100 ? v.toFixed(1) : v.toFixed(2));
const HN = { 1: 'Core', 2: 'Adjacent', 3: 'Breakthrough' };
const cls = x => x > 0.0005 ? 'up' : x < -0.0005 ? 'dn' : '';
const arrow = x => x > 0.0005 ? '▲' : x < -0.0005 ? '▼' : '▬';
function mmss(ms) { ms = Math.max(0, Math.round(ms / 1000)); return Math.floor(ms / 60) + ':' + String(ms % 60).padStart(2, '0'); }
function toast(msg, bad) {
  let t = $('#toast'); if (t) t.remove();
  t = document.createElement('div'); t.id = 'toast'; t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); clearTimeout(toast._t); toast._t = setTimeout(() => t.remove(), bad ? 3800 : 2400);
}
const hcol = h => 'var(--h' + h + ')';

/* ---------- charts ---------- */
function lineChart(o) { // {series:[nums], w,h, T, live, marks:[{x,label,ok}], color, yfmt}
  const w = o.w || 360, h = o.h || 130, L = 38, R = 8, Tp = 10, B = 20;
  const vals = o.series.slice(); if (o.live != null) vals.push(o.live);
  let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  if (o.ymin != null) mn = Math.min(mn, o.ymin); if (o.ymax != null) mx = Math.max(mx, o.ymax);
  const pad = (mx - mn) * 0.1 || 1; mn -= pad; mx += pad; if (o.floor0 && mn < 0) mn = 0;
  const dec = (mx - mn) < 6 ? 1 : 0; const yf = o.yfmt ? (v => o.yfmt(v, dec)) : (v => v.toFixed(dec));
  const T = o.T || (o.series.length - 1 || 1);
  const X = i => L + (w - L - R) * (i / T), Y = v => Tp + (h - Tp - B) * (1 - (v - mn) / (mx - mn));
  let d = ''; o.series.forEach((v, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
  const lastI = o.series.length - 1;
  let s = '<svg class="ch" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.label || 'chart') + '">';
  for (let k = 0; k <= 3; k++) { const v = mn + (mx - mn) * k / 3, y = Y(v); s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 5) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--ink3)" font-family="var(--ff-mono)">' + yf(v) + '</text>'; }
  (o.marks || []).forEach(m => { const x = X(m.x); s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Tp + '" y2="' + (h - B) + '" stroke="' + (m.ok === false ? 'var(--bad)' : m.ok ? 'var(--good)' : 'var(--ink3)') + '" stroke-dasharray="3 3" stroke-width="1"/><text x="' + x.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9.5" fill="var(--ink3)" font-family="var(--ff-mono)">' + esc(m.label) + '</text>'; });
  const col = o.color || 'var(--brand)';
  s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
  if (o.live != null) { const lx = X(lastI + (o.liveX != null ? o.liveX : 0.35)), ly = Y(o.live); s += '<path d="M' + X(lastI).toFixed(1) + ' ' + Y(o.series[lastI]).toFixed(1) + 'L' + lx.toFixed(1) + ' ' + ly.toFixed(1) + '" stroke="' + col + '" stroke-width="2" stroke-dasharray="3 2" fill="none"/><circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="4.2" fill="' + col + '"/>'; }
  else s += '<circle cx="' + X(lastI).toFixed(1) + '" cy="' + Y(o.series[lastI]).toFixed(1) + '" r="3.6" fill="' + col + '"/>';
  if (o.hline != null) { const y = Y(o.hline); s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--ink3)" stroke-dasharray="2 3"/>'; }
  return s + '</svg>';
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
  const q = tk.pr[i];
  if (q.st === 'dead') return { t: 'Failed', c: 'bad' };
  if (q.st === 'sold') return { t: 'Acquired', c: 'good' };
  if (q.st === 'exit') return { t: 'Exited', c: 'good' };
  return { t: DC.STAGES[q.stage], c: '' };
}
function marketTable(pub, tk, o) {
  o = o || {};
  let h = '<table><thead><tr><th>Project</th><th>Price</th><th>Tick</th><th class="hm">Net flow</th><th class="hm">Runway</th><th class="hm">Next gate</th>' + (o.priv ? '<th>Mine</th>' : '') + '</tr></thead><tbody>';
  for (let i = 0; i < DC.NP; i++) {
    const d = DC.PROJ[i], q = tk.pr[i], P = pub.P[i], p0 = q.ph[q.ph.length - 1] || P, ch = P / p0 - 1;
    const lab = projLabel(i, tk), fl = pub.fl[i], live = q.st === 'live';
    const fw = Math.min(54, Math.abs(fl) / (tk.K * 0.008) * 54);
    const run = q.burn ? q.cash / q.burn : 0;
    const gt = q.gate != null && live ? 'in ' + Math.max(0, q.gate - pub.t) : '—';
    const mine = o.priv ? o.priv.hold[i] : 0;
    h += '<tr class="mk' + (o.sel === i ? ' sel' : '') + (live ? '' : ' dead') + '" data-i="' + i + '"><td><span class="pn"><span class="hd h' + d.h + 'c"></span>' + d.code + ' <span class="faint" style="font-weight:500">' + esc(d.name) + '</span></span><span class="ps"><span class="chip ' + lab.c + '">' + lab.t + '</span> ' + HN[d.h] + '</span></td>' +
      '<td><b>' + px(P) + '</b></td><td class="' + cls(ch) + '">' + (live ? arrow(ch) + ' ' + pct(ch, 1) : '') + '</td>' +
      '<td class="hm ' + cls(fl) + '">' + (live ? eurK(fl) + '<span class="flowbar" style="width:' + fw.toFixed(0) + 'px;background:' + (fl >= 0 ? 'var(--good)' : 'var(--bad)') + '"></span>' : '') + '</td>' +
      '<td class="hm">' + (live ? '<span class="chip ' + (run < 1.5 ? 'bad' : run < 3 ? 'warn' : '') + '">' + run.toFixed(1) + '</span>' : '') + '</td><td class="hm">' + gt + '</td>' +
      (o.priv ? '<td>' + (mine ? '<b>' + eurK(mine * P) + '</b><span class="ps">' + mine + ' sh</span>' : '<span class="faint">—</span>') + '</td>' : '') + '</tr>';
  }
  return h + '</tbody></table>';
}
function newsFeed(tk, n) { return '<div class="feed">' + tk.news.slice(0, n || 12).map(x => '<div><span class="t">Y' + x.t + '</span>' + esc(x.x) + '</div>').join('') + '</div>'; }
function tapeFeed(pub) { return '<div class="feed">' + (pub.tape.length ? pub.tape.map(e => '<div><span class="t">Y' + e.t + '</span><b>' + esc(e.n) + '</b> <span class="' + (e.s === 'B' ? 'up' : 'dn') + '">' + (e.s === 'B' ? 'bought' : 'sold') + '</span> ' + e.q + ' <b>' + e.c + '</b> @ ' + px(e.p) + '</div>').join('') : '<div class="faint">No trades yet.</div>') + '</div>'; }
function leaderTable(top, me, total) {
  return '<table class="tbl-sm"><thead><tr><th>#</th><th style="text-align:left">Investor</th><th>Net worth</th><th>Return</th></tr></thead><tbody>' + top.map((x, i) => '<tr' + (me && x[0] === me ? ' style="font-weight:700"' : '') + '><td>' + (i + 1) + '</td><td style="text-align:left">' + esc(x[0]) + (x[2] ? ' <span class="chip">bot</span>' : '') + '</td><td>' + eurK(x[1]) + '</td><td class="' + cls(x[1] - 100000) + '">' + pct(x[1] / 100000 - 1, 1) + '</td></tr>').join('') + '</tbody></table>';
}

/* ---------- debrief ---------- */
function debriefHTML(db) {
  if (!db) return '';
  const P = db.proj, avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const peakOf = p => Math.max.apply(null, p.ph) / p.ph[0], endOf = p => p.ph[p.ph.length - 1] / p.ph[0];
  const dead = P.filter(p => p.st === 'dead'), alive = P.filter(p => p.st === 'exit' || p.st === 'sold');
  const byH = h => P.filter(p => p.h === h);
  const mini = P.map(p => {
    const pass = p.gl.map(g => ({ x: g.t, ok: g.ok, label: g.ok ? '✓' : '✗' }));
    return '<div class="card" style="padding:8px 10px"><div class="row"><span class="hd h' + p.h + 'c"></span><b>' + p.c + '</b><span class="faint small">' + esc(p.n) + '</span><span class="spacer"></span><span class="chip ' + (p.st === 'dead' ? 'bad' : 'good') + '">' + (p.st === 'dead' ? 'failed' : p.st === 'sold' ? 'acquired' : 'exit') + '</span></div>' +
      lineChart({ series: p.ph, T: db.alloc.length - 1, w: 280, h: 96, marks: pass, color: 'var(--h' + p.h + ')', floor0: true, yfmt: (v, d) => v.toFixed(d), label: p.n + ' price' }) +
      '<div class="small muted">peak ' + peakOf(p).toFixed(2) + '× · end ' + endOf(p).toFixed(2) + '× · true quality ' + Math.round(p.q * 100) + ' · class inflow ' + eurK(p.cls) + '</div></div>';
  }).join('');
  const T = db.alloc.length;
  const avgAlloc = [1, 2, 3].map(k => avg(db.alloc.slice(1).map(a => a[k])));
  const bars = db.alloc.map(a => '<div style="flex:1;display:flex;flex-direction:column-reverse;height:110px;min-width:0" title="Year ' + a[0] + '"><i style="height:' + (a[1] * 100) + '%;background:var(--h1)"></i><i style="height:' + (a[2] * 100) + '%;background:var(--h2)"></i><i style="height:' + (a[3] * 100) + '%;background:var(--h3)"></i></div>').join('<span style="width:2px"></span>');
  const maxH = Math.max.apply(null, db.alloc.map(a => a[4]));
  const pk3 = avg(byH(3).map(peakOf)), en3 = avg(byH(3).map(endOf));
  const lost = dead.reduce((a, p) => a + p.cls, 0);
  const lines = [];
  lines.push('<b>Bubble and crash.</b> Breakthrough projects peaked at ' + pk3.toFixed(2) + '× their opening price and ended at ' + en3.toFixed(2) + '× (core: peak ' + avg(byH(1).map(peakOf)).toFixed(2) + '×, end ' + avg(byH(1).map(endOf)).toFixed(2) + '×). Who sold near the peak, and what did they know?');
  lines.push('<b>Staged financing.</b> ' + dead.length + ' of 12 projects failed a gate. The class had put ' + eurK(lost) + ' into them in total. Every gate was an option: which investors paid for that option and which spread it?');
  if (db.ddN != null && db.noN != null && db.ddRet != null && db.noRet != null) lines.push('<b>Information.</b> Investors who bought 2 or more due-diligence reports returned ' + pct(db.ddRet) + ' on average (' + db.ddN + ' people) against ' + pct(db.noRet) + ' for those who bought none (' + db.noN + ' people). ' + eurK(db.ddRev) + ' was spent on reports.');
  if (db.corr != null) lines.push('<b>Diversification.</b> The correlation between the number of different projects a person held and their return was ' + db.corr + '. Compare the spread of outcomes: worst ' + pct(db.q[0], 0) + ', median ' + pct(db.q[2], 0) + ', best ' + pct(db.q[4], 0) + '.');
  lines.push('<b>Portfolio balance.</b> On average the class held ' + Math.round(avgAlloc[0] * 100) + '% core, ' + Math.round(avgAlloc[1] * 100) + '% adjacent and ' + Math.round(avgAlloc[2] * 100) + '% breakthrough, against the 70-20-10 rule. Peak concentration index (HHI) was ' + maxH.toFixed(2) + ' (equal weights across 12 projects would be 0.08).');
  lines.push('<b>Reflexivity.</b> Capital did not only chase value; it created it. Compare the funding cover at each gate with the outcome in the small charts, then ask: who financed the winners before the news, and who paid for the story after it?');
  return '<div class="panel" style="margin-top:14px"><h2>What happened: prompts for the debrief</h2><div class="pb"><ol style="margin:0;padding-left:20px;display:grid;gap:8px">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ol></div></div>' +
    '<div class="panel" style="margin-top:14px"><h2>Where the class put its capital, by horizon</h2><div class="pb"><div style="display:flex;align-items:stretch;gap:0">' + bars + '</div><div style="display:flex;gap:2px;margin-top:2px">' + db.alloc.map(a => '<span class="faint" style="flex:1;text-align:center;font:500 10px var(--ff-mono)">' + a[0] + '</span>').join('') + '</div><div class="legend"><span><span class="hd h1c"></span>Core</span><span><span class="hd h2c"></span>Adjacent</span><span><span class="hd h3c"></span>Breakthrough</span><span class="faint">Each column is one year, share of invested capital.</span></div></div></div>' +
    '<div class="panel" style="margin-top:14px"><h2>Price path of every project</h2><div class="pb"><p class="small muted">Dashed lines mark gates: green passed, red failed. Prices are in euros per share.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">' + mini + '</div></div></div>';
}

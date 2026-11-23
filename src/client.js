/* student client and project detail (also used by host) */
const C = { room: '', url: '', net: null, me: null, pub: null, tk: null, priv: null, off: 0, st: 'down', tab: 'market', sel: null, side: 'buy', amt: 5000, sell: 0.5, pending: null, sq: Date.now(), lastPubAt: 0, lastAck: 0, gotPriv: false, belief: {}, dirty: false, got: false };

function nowHost() { return Date.now() + C.off; }
function liveNW() { const p = C.priv, P = C.pub; if (!p || !P || !P.P.length) return p ? p.cash : 0; let w = p.cash; for (let i = 0; i < p.hold.length; i++) if (p.hold[i]) w += p.hold[i] * P.P[i]; return w; }

/* ---------- project detail ---------- */
function detailTop(i, pub, tk, priv, isHost) {
  const d = DC.PROJ[i], q = tk.pr[i], H = DC.HP[d.h], P = pub.P[i], p0 = q.ph[q.ph.length - 1] || P, ch = P / p0 - 1, live = q.st === 'live';
  const lab = projLabel(i, tk), run = q.burn ? q.cash / q.burn : 0, need = q.gate != null ? q.burn * Math.max(1, q.gate - pub.t) : 0;
  const cov = need ? Math.min(1, q.cash / need) : 1;
  const marks = q.gates.map((g, k) => ({ x: g, label: 'G' + (k + 1), ok: k < q.gi ? (q.st === 'dead' && k === q.gi - 1 ? false : true) : null }));
  const rem = q.gates.length - q.gi;
  let h = '<div class="ph"><div><div class="row"><span class="hd h' + d.h + 'c"></span><h2 style="padding:0;border:0">' + d.code + ' · ' + esc(d.name) + '</h2></div><div class="small muted">' + esc(d.line) + '</div></div><span class="spacer"></span><span class="chip ' + lab.c + '">' + lab.t + '</span></div><div class="pb">';
  h += '<div class="row" style="align-items:baseline"><b class="mono" style="font-size:28px">' + px(P) + '</b><span class="' + cls(ch) + ' mono">' + arrow(ch) + ' ' + pct(ch, 1) + ' this year</span><span class="spacer"></span><span class="chip">' + HN[d.h] + ' horizon</span></div>';
  h += lineChart({ series: q.ph, live: live ? P : null, T: pub.T, w: 380, h: 150, marks: marks, color: 'var(--h' + d.h + ')', floor0: true, yfmt: (v, dd) => v.toFixed(dd), label: d.name + ' price history' });
  h += '<div class="facts"><div class="fact"><span>Net flow this year</span><b class="' + cls(pub.fl[i]) + '">' + eurK(pub.fl[i]) + '</b></div><div class="fact"><span>Net flow last year</span><b class="' + cls(q.flowP) + '">' + eurK(q.flowP) + '</b></div>' +
    '<div class="fact"><span>Next gate</span><b>' + (q.gate != null && live ? 'year ' + q.gate + ' (in ' + Math.max(0, q.gate - pub.t) + ')' : '—') + '</b></div><div class="fact"><span>Gates left</span><b>' + (live ? rem : 0) + ' of 3</b></div>' +
    '<div class="fact"><span>Market depth</span><b title="Money needed to push the price up by 10%">' + eurK(q.D * 0.0953) + ' = +10%</b></div><div class="fact"><span>Step-up on a pass</span><b>×' + H.u.toFixed(2) + ' typical</b></div><div class="fact"><span>Value per share, last round</span><b>' + px(q.v) + '</b></div><div class="fact"><span>Class money in, total</span><b>' + eurK(q.cls) + '</b></div></div>';
  if (live) {
    h += '<h3 style="margin-top:8px">Cash and runway</h3><div class="small muted">Treasury ' + eurK(q.cash) + ' · burn ' + eurK(q.burn) + ' per year · runway ' + run.toFixed(1) + ' years. Cover for the next gate: <b>' + Math.round(cov * 100) + '%</b>. Money flowing in lifts the treasury; a project that runs dry before a gate is more likely to fail it.</div><div class="meter ' + (cov < 0.4 ? 'low' : cov < 0.75 ? 'mid' : '') + '"><i style="width:' + (cov * 100).toFixed(0) + '%"></i></div>';
    h += '<h3 style="margin-top:14px">Traction readings</h3><div class="row"><div>' + (q.obs.length ? sparkline(q.obs, 180, 40, 'var(--h' + d.h + ')') : '<span class="faint small">No readings yet</span>') + '</div><div class="small muted">Latest ' + (q.obs.length ? q.obs[q.obs.length - 1] : '—') + ' · consensus quality <b>' + Math.round(q.cons * 100) + '</b> (a prior of 50 counts as three readings)</div></div>';
    const odds = [30, 50, 70, 90].map(s => '<td>' + Math.round(DC.pGate(d.h, s / 100, q.ps) * 100) + '%</td>').join('');
    h += '<h3 style="margin-top:14px">Pass odds per gate by true quality</h3><table class="tbl-sm"><thead><tr><th style="text-align:left">Quality score</th><th>30</th><th>50</th><th>70</th><th>90</th></tr></thead><tbody><tr><td style="text-align:left">Chance to pass</td>' + odds + '</tr></tbody></table><p class="small faint">At the current cash cover. A failed gate wipes out about 95% of the value; a pass raises the valuation.</p>';
    if (!isHost) {
      const sc = priv && priv.dd && priv.dd[i];
      h += '<div class="note" style="margin-top:10px">' + (sc != null ? '<b>Your due-diligence report:</b> quality score <b>' + sc + '</b> (typical error ±10). Only you can see it. Traction readings are public; this is sharper.' : '<div class="row"><span><b>Due-diligence report</b> · a private, sharper estimate of quality (error ±10) for ' + eur(tk.ddCost) + '.</span><span class="spacer"></span><button class="btn sm" data-act="dd" data-i="' + i + '">Buy report</button></div>') + '</div>';
    }
  } else {
    const st = q.st === 'dead' ? 'This project failed a gate. Its shares are worth roughly 5% of the last price.' : q.st === 'sold' ? 'Acquired. Holders were paid out in cash at ' + px(q.exitV) + ' per share.' : 'Exited at ' + px(q.exitV) + ' per share.';
    h += '<div class="note">' + st + '</div>';
  }
  return h + '</div>';
}
function valHTML(i, pub, tk, priv) {
  const q = tk.pr[i]; if (q.st !== 'live') return '';
  const sc = priv && priv.dd && priv.dd[i] != null ? priv.dd[i] : Math.round(q.cons * 100);
  const cur = C.belief[i] != null ? C.belief[i] : sc;
  return '<div class="ticket"><h3>Valuation helper</h3><p class="small muted">Set your own estimate of quality. The model prices the remaining gates (chance to pass × step-up), discounts to settlement and compares with the market. It ignores market mood and news.</p><div class="row"><input class="slider" id="vq" type="range" min="10" max="95" value="' + cur + '" style="flex:1"><b class="mono" id="vqv">' + cur + '</b></div><div class="quote"><span>Model value per share</span><span id="vmv"></span><span>Market price</span><span id="vmp"></span><span>Upside to model</span><span id="vmu"></span></div></div>';
}
function valUpdate(i) {
  const pub = C.pub, tk = C.tk; if (!pub || !tk || !$('#vq')) return; const q = tk.pr[i], d = DC.PROJ[i], H = DC.HP[d.h];
  const s = +$('#vq').value; C.belief[i] = s; $('#vqv').textContent = s;
  const rem = q.gates.length - q.gi, pg = DC.pGate(d.h, s / 100, q.ps);
  const mv = q.v * Math.pow(pg * H.u, rem) / Math.pow(1 + H.r, pub.T - pub.t);
  $('#vmv').textContent = px(mv); $('#vmp').textContent = px(pub.P[i]); const u = mv / pub.P[i] - 1; const e = $('#vmu'); e.textContent = pct(u, 0); e.className = cls(u);
}

/* ---------- ticket ---------- */
function ticketMax(i) {
  const pub = C.pub, tk = C.tk, p = C.priv, q = tk.pr[i], P = pub.P[i]; if (q.st !== 'live') return 0;
  const ok = S => { const u = S * P / q.D; if (u >= 0.95) return false; const x = -q.D * Math.log(1 - u), cost = x * (1 + tk.fee); if (cost > p.cash + 1e-9) return false; const Pn = P * Math.exp(x / q.D); let oth = 0; for (let k = 0; k < p.hold.length; k++) if (k !== i && p.hold[k]) oth += p.hold[k] * pub.P[k]; const pos = (p.hold[i] + S) * Pn; return pos <= tk.maxExp * ((p.cash - cost) + pos + oth) + 1e-6; };
  let lo = 0, hi = Math.floor(0.94 * q.D / P); while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (ok(m)) lo = m; else hi = m - 1; } return lo;
}
function ticketHTML(i) {
  const q = C.tk.pr[i]; if (q.st !== 'live') return '';
  const amts = [2000, 5000, 10000, 25000];
  return '<div class="ticket"><div class="row"><div class="seg"><button class="buy' + (C.side === 'buy' ? ' on' : '') + '" data-act="side" data-s="buy">Buy</button><button class="sell' + (C.side === 'sell' ? ' on' : '') + '" data-act="side" data-s="sell">Sell</button></div><span class="spacer"></span><span class="small muted">Cash <b id="tcash" class="mono"></b></span></div>' +
    (C.side === 'buy' ? '<div class="amts">' + amts.map(a => '<button class="btn sm' + (C.amt === a ? ' on' : '') + '" data-act="amt" data-a="' + a + '">' + eurK(a) + '</button>').join('') + '<button class="btn sm' + (C.amt === 'max' ? ' on' : '') + '" data-act="amt" data-a="max">Max</button><input id="tcu" type="number" inputmode="numeric" min="0" step="500" placeholder="€ custom" style="width:100px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px 8px;min-height:30px"></div>'
      : '<div class="amts">' + [0.25, 0.5, 0.75, 1].map(f => '<button class="btn sm' + (C.sell === f ? ' on' : '') + '" data-act="frac" data-f="' + f + '">' + Math.round(f * 100) + '%</button>').join('') + '</div>') +
    '<div class="quote" id="tq"></div><div id="tw"></div><button class="btn pri" id="tgo" data-act="exec" style="width:100%"></button></div>';
}
function quoteState(i) {
  const pub = C.pub, tk = C.tk, p = C.priv, q = tk.pr[i], P = pub.P[i]; let S = 0, x = 0, ok = true, warn = '';
  if (C.side === 'buy') {
    let amt = C.amt === 'max' ? 1e12 : C.amt; if (C.amt === 'cust') amt = C.custom || 0;
    if (C.amt === 'max') S = ticketMax(i); else { S = DC.sharesForCash({ pr: [{ D: q.D, P: P }] }, 0, Math.min(amt, p.cash)); }
    if (S >= 1) { const u = S * P / q.D; if (u >= 0.95) { S = Math.floor(0.94 * q.D / P); } x = -q.D * Math.log(1 - S * P / q.D); }
    const mx = ticketMax(i); if (S > mx) { S = mx; x = S >= 1 ? -q.D * Math.log(1 - S * P / q.D) : 0; warn = S < 1 ? 'Not allowed: cash or the 40% concentration limit.' : 'Reduced to your limit (cash or ' + Math.round(tk.maxExp * 100) + '% concentration).'; }
    if (S < 1) { ok = false; if (!warn) warn = 'Amount too small or not allowed.'; }
    const fee = x * tk.fee; return { S, x, fee, tot: x + fee, avg: S ? x / S : 0, ok, warn };
  }
  S = Math.floor(p.hold[i] * C.sell); if (S < 1) return { S: 0, x: 0, fee: 0, tot: 0, avg: 0, ok: false, warn: 'You hold no shares of this project.' };
  x = q.D * Math.log(1 + S * P / q.D); const fee = x * tk.fee; return { S, x, fee, tot: x - fee, avg: x / S, ok: true, warn: '' };
}
function ticketUpdate() {
  const i = C.sel; if (i == null || !C.pub || !C.tk || !C.priv || !$('#tq')) return; const q = C.tk.pr[i]; if (q.st !== 'live') return;
  const r = quoteState(i), P = C.pub.P[i]; $('#tcash').textContent = eur(C.priv.cash);
  const slip = r.S ? r.avg / P - 1 : 0;
  $('#tq').innerHTML = C.side === 'buy' ? '<span>Shares</span><span>' + r.S + '</span><span>Average price</span><span>' + (r.S ? px(r.avg) : '—') + ' <span class="' + (slip > 0.02 ? 'wn' : '') + '">(' + pct(slip, 1) + ' impact)</span></span><span>Fee</span><span>' + eur(r.fee) + '</span><span><b>You pay</b></span><span><b>' + eur(r.tot) + '</b></span>' :
    '<span>Shares</span><span>' + r.S + ' of ' + C.priv.hold[i] + '</span><span>Average price</span><span>' + (r.S ? px(r.avg) : '—') + ' <span class="' + (slip < -0.02 ? 'wn' : '') + '">(' + pct(slip, 1) + ' impact)</span></span><span>Fee</span><span>' + eur(r.fee) + '</span><span><b>You receive</b></span><span><b>' + eur(r.tot) + '</b></span>';
  $('#tw').innerHTML = r.warn ? '<div class="note warn">' + esc(r.warn) + '</div>' : '';
  const b = $('#tgo'); b.textContent = (C.side === 'buy' ? 'Buy ' : 'Sell ') + r.S + ' ' + DC.PROJ[i].code; b.className = 'btn ' + (C.side === 'buy' ? 'pri' : 'sell'); b.disabled = !r.ok || !!C.pending || C.pub.ph !== 'run';
  if (C.pub.ph === 'pause') $('#tw').innerHTML = '<div class="note warn">Market paused by the host.</div>';
}

/* ---------- sending actions ---------- */
function sendAct(a) {
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
  if (a.ok) { toast(a.k === 'b' ? 'Bought ' + a.S + ' ' + DC.PROJ[a.p].code + ' for ' + eur(a.x) : a.k === 's' ? 'Sold ' + a.S + ' ' + DC.PROJ[a.p].code + ' for ' + eur(a.x) : 'Report bought: quality score ' + a.sc); if (a.k === 'd') C.dirty = true; }
  else toast(a.err || 'Rejected', true);
  ticketUpdate();
}

/* ---------- main student view ---------- */
function clientLanding(P) {
  const app = $('#app');
  app.innerHTML = '<div class="landing"><div class="hero"><div class="eyebrow">MSc Innovation Management</div><h1>Disruption Cycle: Capital Markets</h1><p class="muted">A live market for innovation projects. Every trade you make moves prices for everyone, in real time.</p><div class="cardrow"><div class="card"><h3>I am a student</h3><div class="field"><label>Join code</label><input id="jc" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="e.g. K7M2Q0"></div><button class="btn pri" id="jb">Join</button><div id="je" class="err"></div></div><div class="card"><h3>I am the facilitator</h3><p class="small muted">Run the market from your browser. No server needed.</p><button class="btn" id="hb">Set up the market</button></div></div></div></div>';
  $('#jb').onclick = () => { const c = $('#jc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 5) { $('#je').textContent = 'Enter the code shown on the screen.'; return; } const r = c.slice(0, 5), b = c.slice(5) || '0'; location.hash = 'r=' + r + '&b=' + b; location.reload(); };
  $('#hb').onclick = () => { location.hash = 'host=1'; location.reload(); };
}
function clientStart(P) {
  C.room = P.get('r').toUpperCase(); C.url = brokerUrl(P);
  const key = 'dcap-me-' + C.room; let me = null; try { me = JSON.parse(localStorage.getItem(key)); } catch (e) { }
  if (!me) {
    $('#app').innerHTML = '<div class="landing"><div class="hero"><div class="eyebrow">Room ' + esc(C.room) + '</div><h1>Your name</h1><p class="muted">Your name is shown to the class on the trade feed and leaderboard.</p><div class="field"><input id="nm" maxlength="18" autocomplete="nickname" placeholder="First name and initial"></div><button class="btn pri" id="nb">Enter the market</button></div></div>';
    const go = () => { const n = $('#nm').value.trim(); if (!n) return; me = { id: rid(8), tok: rid(14), name: n }; localStorage.setItem(key, JSON.stringify(me)); clientBoot(me); };
    $('#nb').onclick = go; $('#nm').onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#nm').focus(), 50); return;
  }
  clientBoot(me);
}
function clientBoot(me) {
  C.me = me;
  $('#app').innerHTML = '<header class="top"><div class="wrap"><div class="brand">Disruption Cycle<small>Capital Markets</small></div><div class="clock"><div class="small mono" id="ck"></div><div class="bar"><i id="cb" style="width:0%"></i></div></div><div class="kpi"><b id="kNW">—</b><span>Net worth</span></div><div class="kpi hm"><b id="kCash">—</b><span>Cash</span></div><div class="kpi"><b id="kRank">—</b><span>Rank</span></div><span class="spacer"></span><span class="small muted hm" id="kName"></span><span id="cconn" class="conn" title="connection"></span></div><div class="wrap"><div class="tabs deskonly" id="ctabs"></div></div></header><div id="banner"></div><main class="wrap main"><div id="cbody"></div></main><nav class="bottom" id="cnav"></nav>';
  $('#kName').textContent = me.name;
  C.net = netOpen({
    url: C.url, room: C.room, subs: ['pub', 'tk', 'u/' + me.id],
    onState: (s, d) => { C.st = s; $('#cconn') && ($('#cconn').className = 'conn ' + (s === 'up' ? 'ok' : s === 'err' ? 'bad' : '')); if (s === 'up') sendHi(); },
    onMsg: (t, m) => {
      if (t === 'pub') { C.pub = m; C.off = m.ts - Date.now(); C.lastPubAt = Date.now(); }
      else if (t === 'tk') { C.tk = m; C.off = m.ts - Date.now(); }
      else if (t.startsWith('u/')) { if (m.deny) { C.denied = true; } else { C.priv = m; if (!C.gotPriv) { C.gotPriv = true; if (m.ack) C.lastAck = m.ack.sq; } else if (m.ack) handleAck(m.ack); } }
      C.dirty = true;
    },
  });
  setInterval(() => { if (C.st === 'up') { if (!C.priv) sendHi(); else C.net.send('a', { k: 'hb', id: C.me.id, tok: C.me.tok }); } }, 9000);
  setInterval(() => { pendingWatch(); renderClient(); }, 500);
  document.addEventListener('click', clientClick); document.addEventListener('input', clientInput);
  window.addEventListener('resize', () => { C.dirty = true; });
  renderClient(true);
}
function sendHi() { if (C.net) C.net.send('a', { k: 'hi', id: C.me.id, tok: C.me.tok, name: C.me.name }, 1); }
const TABS = [['market', 'Market'], ['port', 'Portfolio'], ['news', 'News & trades'], ['board', 'Leaderboard']];
function renderClient(force) {
  const pub = C.pub, tk = C.tk, body = $('#cbody'); if (!body) return;
  const tb = TABS.map(t => '<button class="tab' + (C.tab === t[0] ? ' on' : '') + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>').join('');
  if ($('#ctabs').dataset.k !== C.tab) { $('#ctabs').innerHTML = tb; $('#ctabs').dataset.k = C.tab; $('#cnav').innerHTML = TABS.map(t => '<button class="' + (C.tab === t[0] ? 'on' : '') + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>').join(''); }
  if (C.denied) { body.innerHTML = '<div class="panel"><div class="pb"><h2>This name is already in use in this room</h2><p>Open the join link again and pick a different name, or clear this site’s data.</p></div></div>'; return; }
  const stale = pub && Date.now() - C.lastPubAt > 9000;
  $('#banner').innerHTML = !pub ? '' : stale ? '<div class="wrap"><div class="note warn" style="margin-top:8px">Waiting for the host… your last data is shown.</div></div>' : '';
  if (!pub || !tk || !C.priv) { body.innerHTML = '<div class="panel"><div class="pb"><h2>Connecting…</h2><p class="muted">' + (C.st === 'up' ? 'Connected to the relay. Waiting for the host to answer.' : C.st === 'err' ? 'The relay is not reachable from this network. Try another network, such as mobile data.' : 'Reaching the relay.') + '</p></div></div>'; body.dataset.k = ''; return; }
  // header
  const left = pub.ph === 'run' ? Math.max(0, pub.te - nowHost()) : pub.ph === 'pause' ? tk.pz : 0;
  $('#ck').textContent = pub.ph === 'lobby' ? 'Lobby' : pub.ph === 'end' ? 'Final settlement' : (pub.ph === 'pause' ? 'PAUSED · ' : '') + 'Year ' + pub.t + ' / ' + pub.T + ' · ' + mmss(left);
  $('#cb').style.width = (pub.ph === 'end' ? 100 : pub.ph === 'lobby' ? 0 : 100 - left / (tk.tickSec ? tk.tickSec * 1000 : 75000) * 100) + '%';
  const nw = liveNW(); $('#kNW').textContent = eurK(nw); $('#kNW').className = cls(nw - tk.cash0); $('#kCash').textContent = eurK(C.priv.cash);
  const rk = 1 + pub.w.filter(w => w > Math.round(nw / 100) * 100 + 50).length; $('#kRank').textContent = '#' + rk + '/' + pub.cnt;
  if (pub.ph === 'lobby') { body.innerHTML = '<div class="panel"><div class="pb"><h2>You are in, ' + esc(C.me.name) + '</h2><p class="muted">' + pub.cnt + ' investors in the lobby. The market opens when the host presses start. You begin with ' + eur(tk.cash0) + '.</p></div></div>'; body.dataset.k = ''; return; }
  const sig = C.tab + '|' + (C.sel == null ? 'x' : C.sel) + '|' + window.innerWidth;
  const need = force || C.dirty || body.dataset.k !== sig; if (!need) { ticketUpdate(); return; }
  C.dirty = false;
  if (C.tab === 'market') {
    const narrow = window.innerWidth <= 900;
    if (body.dataset.k !== sig) {
      body.innerHTML = '<div class="cols"><div class="panel"><h2>Market <span class="small faint">tap a project</span></h2><div id="cMk"></div></div><div class="panel' + (narrow && C.sel != null ? ' overlay' : '') + '" id="cDt"></div></div>';
      body.dataset.k = sig; C.rebuiltDt = true;
    }
    $('#cMk').innerHTML = marketTable(pub, tk, { priv: C.priv, sel: C.sel });
    const dt = $('#cDt');
    if (C.sel == null) { if (!narrow) dt.innerHTML = '<div class="pb"><h2>Pick a project</h2><p class="muted">Each project is a stage-financed venture. Read its cash, traction and next gate, then buy or sell. Your trade moves the price for everybody and adds money to the company’s treasury.</p><div class="note"><b>The rules in short.</b> Prices move with trading pressure and with news. Gates are decision points where a project either passes and is revalued or fails and loses almost everything. At the end every survivor settles at its real value. You hold at most ' + Math.round(tk.maxExp * 100) + '% of your net worth in one project.</div></div>'; else dt.innerHTML = ''; }
    else {
      const i = C.sel; if (C.rebuiltDt || !$('#dtTop')) { dt.innerHTML = (narrow ? '<div class="ph"><button class="btn sm" data-act="back">← Market</button></div>' : '') + '<div id="dtTop"></div><div class="pb" style="padding-top:0"><div id="dtTkt">' + ticketHTML(i) + '</div><div id="dtVal">' + valHTML(i, pub, tk, C.priv) + '</div></div>'; C.rebuiltDt = false; }
      $('#dtTop').innerHTML = detailTop(i, pub, tk, C.priv, false); valUpdate(i); ticketUpdate();
    }
  } else if (C.tab === 'port') { body.innerHTML = portHTML(pub, tk); body.dataset.k = sig; }
  else if (C.tab === 'news') { body.innerHTML = '<div class="cols"><div class="panel"><h2>Headlines</h2><div class="pb">' + newsFeed(tk, 20) + '</div></div><div class="panel"><h2>Live trades from the whole class</h2><div class="pb">' + tapeFeed(pub) + '</div></div></div>'; body.dataset.k = sig; }
  else if (C.tab === 'board') { body.innerHTML = '<div class="panel"><h2>Leaderboard <span class="small faint">at current market prices</span></h2><div class="pb">' + leaderTable(pub.ph === 'end' && tk.lbAll ? tk.lbAll.slice(0, 25) : pub.top, C.me.name) + '<p class="small muted" style="margin-top:8px">You are #' + rk + ' of ' + pub.cnt + '.</p></div></div>' + (pub.ph === 'end' ? debriefHTML(tk.db) : ''); body.dataset.k = sig; }
}
function portHTML(pub, tk) {
  const p = C.priv, nw = liveNW(); let rows = '', invested = 0; const hz = [0, 0, 0];
  for (let i = 0; i < DC.NP; i++) { const s = p.hold[i]; if (!s) continue; const v = s * pub.P[i], d = DC.PROJ[i], pl = v - p.cost[i]; invested += v; hz[d.h - 1] += v; rows += '<tr class="mk" data-i="' + i + '" data-act="goto"><td><span class="pn"><span class="hd h' + d.h + 'c"></span>' + d.code + '</span><span class="ps">' + s + ' shares</span></td><td>' + eurK(v) + '</td><td>' + px(p.cost[i] / s) + '</td><td>' + px(pub.P[i]) + '</td><td class="' + cls(pl) + '">' + pct(p.cost[i] ? v / p.cost[i] - 1 : 0, 0) + '</td><td>' + Math.round(v / nw * 100) + '%</td></tr>'; }
  const end = pub.ph === 'end';
  let h = '<div class="cols"><div style="display:grid;gap:14px"><div class="panel"><h2>' + (end ? 'Final result' : 'Net worth') + '</h2><div class="pb"><div class="row" style="align-items:baseline"><b class="mono" style="font-size:30px">' + eur(nw) + '</b><span class="' + cls(nw - tk.cash0) + ' mono">' + pct(nw / tk.cash0 - 1, 1) + '</span></div>' + lineChart({ series: p.nwh, T: pub.T, w: 380, h: 120, hline: tk.cash0, yfmt: v => (v / 1000).toFixed(0) + 'k', label: 'net worth' }) + '<p class="small muted">Cash ' + eur(p.cash) + ' · invested ' + eur(invested) + ' · trades ' + p.tr + (end ? '' : ' · dotted line is your starting capital') + '</p></div></div>' +
    '<div class="panel"><h2>Mix by horizon</h2><div class="pb">' + stackBar([{ v: hz[0], c: 'var(--h1)', l: 'Core' }, { v: hz[1], c: 'var(--h2)', l: 'Adjacent' }, { v: hz[2], c: 'var(--h3)', l: 'Breakthrough' }, { v: p.cash, c: 'var(--line)', l: 'Cash' }]) + '<p class="small muted" style="margin-top:8px">Lecture rule of thumb for an innovation portfolio: 70% core, 20% adjacent, 10% breakthrough.</p></div></div></div>' +
    '<div class="panel"><h2>Positions</h2>' + (rows ? '<table><thead><tr><th>Project</th><th>Value</th><th>Avg cost</th><th>Price</th><th>P/L</th><th>Weight</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="pb"><p class="muted">No positions yet. Open the Market tab and buy your first project.</p></div>') + '</div></div>';
  if (end) h += debriefHTML(tk.db);
  return h;
}
function clientClick(e) {
  const t = e.target.closest('[data-act],tr.mk'); if (!t) return;
  const a = t.dataset.act;
  if (t.matches('tr.mk') && !a) { C.sel = +t.dataset.i; C.tab = 'market'; C.rebuiltDt = true; C.dirty = true; $('#cbody').dataset.k = ''; renderClient(true); window.scrollTo(0, 0); return; }
  if (a === 'goto') { C.sel = +t.dataset.i; C.tab = 'market'; C.rebuiltDt = true; C.dirty = true; $('#cbody').dataset.k = ''; $('#ctabs').dataset.k = ''; renderClient(true); return; }
  if (a === 'tab') { C.tab = t.dataset.t; $('#ctabs').dataset.k = ''; $('#cbody').dataset.k = ''; C.dirty = true; renderClient(true); return; }
  if (a === 'back') { C.sel = null; $('#cbody').dataset.k = ''; C.dirty = true; renderClient(true); return; }
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

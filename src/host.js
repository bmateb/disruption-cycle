/* host console: authoritative market maker running in the facilitator's browser */
const Host = { G: null, net: null, room: '', url: '', bi: 0, st: 'down', dirtyPub: true, dirtyTk: true, dirtyPriv: new Set(), tab: 'board', sel: 0, setup: null, pubBase: '', started: false, paused: false, remain: 0, sawAt: {}, wake: null, ns: 0, nsOff: 1000, tf: 'live', mod: null, openP: new Set(), dirtyHx: true, hxAt: 0, endShown: false };

function hostSave() { try { localStorage.setItem('dcap-host-' + Host.room, JSON.stringify({ G: Host.G, bi: Host.bi, bu: Host.bu, url: Host.url, pubBase: Host.pubBase, paused: Host.paused, remain: Host.remain, nsOff: Host.nsOff, brk: Host.brk })); localStorage.setItem('dcap-host-last', Host.room); } catch (e) { } }
function hostLoad(room) { try { return JSON.parse(localStorage.getItem('dcap-host-' + room)); } catch (e) { return null; } }

function hostConnect() {
  if (Host.net) { try { Host.net.close(); } catch (e) { } }
  Host.net = netOpen({
    url: Host.url, room: Host.room, subs: ['a'],
    onMsg: hostOnMsg, onState: (s, d) => { Host.st = s; Host.stDetail = d; renderHostChrome(); if (s === 'up') { Host.dirtyPub = Host.dirtyTk = true; Host.G.ord.forEach(id => Host.dirtyPriv.add(id)); } },
  });
}
function nameUnique(G, id, name) {
  name = String(name || 'Investor').replace(/[<>]/g, '').trim().slice(0, 18) || 'Investor';
  const taken = new Set(G.ord.filter(k => k !== id).map(k => G.pl[k].name)); let n = name, i = 2;
  while (taken.has(n)) n = name.slice(0, 15) + ' ' + (i++);
  return n;
}
function hostOnMsg(t, m) {
  const G = Host.G; if (t !== 'a' || !m || !m.id) return;
  const id = String(m.id).slice(0, 12);
  if (m.k === 'hi' || m.k === 'hb') {
    let pl = G.pl[id];
    if (!pl) {
      if (m.k === 'hb') return;
      pl = DC.addPlayer(G, id, nameUnique(G, id, m.name)); pl.tok = String(m.tok || '').slice(0, 24);
      if (G.ph === 'run' || G.ph === 'pause') pl.join = G.t;
    } else if (pl.tok && m.tok !== pl.tok) { Host.net.send('u/' + id, { deny: 1 }); return; }
    Host.sawAt[id] = Date.now();
    if (m.k === 'hi') { Host.dirtyPriv.add(id); Host.dirtyPub = Host.dirtyTk = Host.dirtyHx = true; }
    return;
  }
  if (m.k === 'rd') {
    const pl = G.pl[id]; if (!pl || pl.tok !== m.tok) return; Host.sawAt[id] = Date.now();
    pl.rdy = m.v ? 1 : 0; Host.dirtyPriv.add(id); Host.dirtyPub = true; return;
  }
  if (m.k === 'act') {
    const pl = G.pl[id]; if (!pl || pl.tok !== m.tok) return;
    Host.sawAt[id] = Date.now();
    if (m.sq <= pl.sq) { Host.dirtyPriv.add(id); return; } // duplicate, resend ack
    pl.sq = m.sq;
    DC.act(G, id, Object.assign({}, m.a, { sq: m.sq }));
    Host.dirtyPriv.add(id); Host.dirtyPub = true;
  }
}
function hostFlush() {
  const G = Host.G, n = Host.net; if (!n || Host.st !== 'up') return;
  const te = hostTE();
  if (Host.dirtyTk) { Host.dirtyTk = false; n.send('tk', Object.assign(DC.tk(G), { te: te, ts: Date.now(), pz: Host.paused ? Host.remain : 0 })); }
  if (Host.dirtyPub) { Host.dirtyPub = false; n.send('pub', Object.assign(DC.pub(G), { te: te, ts: Date.now(), pz: Host.paused ? 1 : 0, bk: Host.brk ? Host.brk.until : 0, mj: Host.brk && Host.brk.ev ? G.maj : null })); }
  if (Host.dirtyHx && Date.now() - Host.hxAt > 3000) { Host.dirtyHx = false; Host.hxAt = Date.now(); n.send('hx', DC.hx(G)); }
  for (const id of Host.dirtyPriv) { const p = DC.priv(G, id); if (p) n.send('u/' + id, p); }
  Host.dirtyPriv.clear();
}
function hostTE() { const G = Host.G; if (!G || G.ph !== 'run') return 0; return Host.ns + Math.max(0, G.yl - G.sc - 1) * 1000; }
function hostStart() {
  const G = Host.G; DC.start(G); Host.ns = Date.now() + 1000; Host.started = true; Host.paused = false;
  markAll(); Host.dirtyHx = true; hostSave(); renderHost(true);
}
function markAll() { Host.dirtyPub = Host.dirtyTk = true; Host.G.ord.forEach(id => Host.dirtyPriv.add(id)); }
function startBreak() {
  const G = Host.G; if (G.ph !== 'run') return;
  const ev = G.cfg.evp && G.maj && G.maj.length, plan = G.cfg.brk; if (!ev && !plan) return;
  const secs = Math.max(ev ? (G.cfg.evSec || 15) : 0, plan ? (G.cfg.brkSec || 30) : 0, 5);
  G.ph = 'pause'; Host.paused = true; Host.remain = 0; Host.nsOff = 1000; Host.brk = { until: Date.now() + secs * 1000, ev: ev ? 1 : 0 }; Host.annT = -1;
}
function hostYear() { // year boundary: gate results, new readings, news, settlement
  const G = Host.G; DC.advance(G); startBreak(); markAll(); Host.dirtyHx = true; hostSave(); renderHost();
}
function hostTickNow() { const G = Host.G; if (G.ph !== 'run') return; hostYear(); Host.ns = Date.now() + 1000; }
function hostPause() {
  const G = Host.G, now = Date.now();
  if (G.ph === 'run') { Host.remain = Math.max(0, hostTE() - now); Host.nsOff = Math.max(0, Host.ns - now); G.ph = 'pause'; Host.paused = true; }
  else if (G.ph === 'pause') { G.ph = 'run'; Host.paused = false; Host.brk = null; Host.ns = now + Host.nsOff; }
  markAll(); hostSave(); renderHost();
}
function hostEndNow() { const G = Host.G; if (G.ph === 'pause') { G.ph = 'run'; Host.paused = false; Host.brk = null; } let guard = 40; while (G.ph === 'run' && guard--) DC.advance(G); markAll(); Host.dirtyHx = true; hostSave(); renderHost(); }
function hostFire(k) { const G = Host.G; const news = []; DC.fire(G, k, news); DC.recomputeAll(G); DC.pushNews(G, news, G.t + 1); Host.dirtyTk = Host.dirtyPub = true; renderHost(); }
function hostLoop() {
  const G = Host.G; if (!G) return;
  const now = Date.now();
  if (now - (Host.beat || 0) > 5000) { Host.beat = now; Host.dirtyPub = true; if (G.ph !== 'run') Host.dirtyTk = true; } // heartbeat so phones can tell the link is alive
  if (G.ph === 'run') {
    let guard = 0;
    while (now >= Host.ns && G.ph === 'run' && guard++ < 90) {
      DC.second(G); Host.ns += 1000; Host.dirtyPub = true;
      for (const id of G.ord) { const pl = G.pl[id]; if (pl.bot && Math.random() < 4 / G.cfg.tickSec) DC.botAct(G, pl, Math.random); }
      if (G.sc >= G.yl) hostYear();
    }
    if (guard >= 90) Host.ns = now + 1000;
  }
  else if (G.ph === 'pause' && Host.brk && now >= Host.brk.until) hostPause();
  hostFlush();
}
function hostAutosave() { if (Host.G) hostSave(); }
function humanOnline(id) { return Host.sawAt[id] && Date.now() - Host.sawAt[id] < 28000; }

/* ----------------------------- host UI ----------------------------- */
function joinLink() { return Host.pubBase + '#r=' + Host.room + (Host.bu ? '&bu=' + encodeURIComponent(Host.bu) : '&b=' + Host.bi); }
function joinCode() { return Host.room + (Host.bu ? '' : Host.bi); }

function hostSetupView() {
  const app = $('#app'); const last = localStorage.getItem('dcap-host-last'); const saved = last && hostLoad(last);
  const isFile = location.protocol === 'file:';
  app.innerHTML = '<div class="landing"><div class="hero"><div class="eyebrow">Facilitator</div><h1>Set up the market</h1>' +
    '<p class="muted">Your browser runs the market. Prices update every second. Students connect through a free public relay, so nothing needs renting. Keep this tab open and in the foreground during the game.</p>' +
    (saved && saved.G && saved.G.ph !== 'end' ? '<div class="card" style="margin-top:14px"><h3>Resume previous session</h3><p class="small muted">Room ' + esc(last) + ', ' + (saved.G.ph === 'prep' ? 'practice phase' : 'year ' + Math.min(saved.G.t + 1, saved.G.T) + ' of ' + saved.G.T) + ', ' + saved.G.ord.length + ' investors.</p><button class="btn pri" id="resume">Resume</button></div>' : '') +
    '<div class="card" style="margin-top:14px"><div class="grid2"><div class="field"><label>Years in the game</label><input id="sT" type="number" min="8" max="24" value="14"></div><div class="field"><label>Seconds per year</label><input id="sS" type="number" min="20" max="240" value="75"></div></div>' +
    '<div class="grid2"><div class="field"><label>Market bots (fill thin markets)</label><input id="sB" type="number" min="0" max="30" value="0"></div><div class="field"><label>Expected students</label><input id="sN" type="number" min="1" max="120" value="30"></div></div>' +
    '<div class="field"><label>Relay</label><select id="sR">' + BROKERS.map((b, i) => '<option value="' + i + '">' + b.n + '</option>').join('') + '<option value="local">Same browser only (rehearsal)</option><option value="custom">My own broker (wss://…)</option></select></div>' +
    '<div class="field hide" id="cu"><label>Broker URL</label><input id="sU" placeholder="wss://example.hivemq.cloud:8884/mqtt"></div>' +
    '<div class="field"><label>Address students will open</label><input id="sA" value="' + esc(isFile ? '' : location.href.split('#')[0]) + '" placeholder="https://… (where you published this file)"></div>' +
    (isFile ? '<div class="note warn">This file is opened from your computer, so phones cannot reach it. Publish it on any free static host first (see the guide), then open it from that address.</div>' : '') +
    '<div class="row"><label class="small"><input type="checkbox" id="sE" checked> Market-wide events (boom, funding winter, disruptor, takeover rumour)</label><label class="small"><input type="checkbox" id="sNw" checked> Company news headlines (incl. fun stories)</label><label class="small"><input type="checkbox" id="sTp" checked> Two fake “hot tips” as attention checks</label></div><div class="row" style="margin-top:8px"><label class="small"><input type="checkbox" id="sEv" checked> Pause on major news (rounds, IPOs, market events) for</label><label class="small"><input id="sEs" type="number" min="5" max="120" value="15" style="width:60px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"> seconds</label></div><div class="row" style="margin-top:8px"><label class="small"><input type="checkbox" id="sBk" checked> Planning break at the end of every year</label><label class="small">for <input id="sBs" type="number" min="5" max="300" value="30" style="width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"> seconds</label><label class="small"><input type="checkbox" id="sX"> Hide names on trade feed</label></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn pri" id="go">Test relay and open lobby</button><span id="gs" class="small muted"></span></div></div></div></div>';
  $('#sR').onchange = e => $('#cu').classList.toggle('hide', e.target.value !== 'custom');
  const rs = $('#resume'); if (rs) rs.onclick = () => hostResume(last, saved);
  $('#go').onclick = async () => {
    const sel = $('#sR').value; const gs = $('#gs'); gs.textContent = 'Testing…';
    let url, bi = 0, bu = null;
    if (sel === 'local') url = 'local'; else if (sel === 'custom') { url = $('#sU').value.trim(); bu = url; if (!/^wss?:\/\//.test(url)) { gs.textContent = 'Enter a ws:// or wss:// address.'; return; } }
    else { bi = +sel; url = BROKERS[bi].u; }
    let r = await brokerTest(url, 7000);
    if (!r.ok && sel !== 'local' && sel !== 'custom') { for (let k = 0; k < BROKERS.length; k++) { if (k === bi) continue; gs.textContent = BROKERS[bi].n + ' unreachable, trying ' + BROKERS[k].n + '…'; const r2 = await brokerTest(BROKERS[k].u, 7000); if (r2.ok) { bi = k; url = BROKERS[k].u; r = r2; break; } } }
    if (!r.ok) { gs.innerHTML = '<span class="err">No relay reachable from this network (' + esc(r.err || '') + '). Try a phone hotspot, another relay, or your own broker.</span>'; return; }
    Host.url = url; Host.bi = bi; Host.bu = bu; Host.room = roomCode(); Host.pubBase = ($('#sA').value.trim() || location.href.split('#')[0]).split('#')[0];
    const cfg = { T: Math.max(8, Math.min(24, +$('#sT').value || 14)), tickSec: Math.max(20, Math.min(240, Math.round((+$('#sS').value || 75) / 5) * 5)), events: $('#sE').checked, news: $('#sNw').checked, tips: $('#sTp').checked, evp: $('#sEv').checked, evSec: Math.max(5, Math.min(120, +$('#sEs').value || 15)), brk: $('#sBk').checked, brkSec: Math.max(5, Math.min(300, +$('#sBs').value || 30)), anon: $('#sX').checked };
    Host.G = DC.newGame(cfg, Host.room + Date.now()); Host.G.nbots = Math.max(0, Math.min(30, +$('#sB').value || 0)); Host.expected = +$('#sN').value || 30;
    for (let k = 0; k < Host.G.nbots; k++) DC.addPlayer(Host.G, 'bot' + k, ['Ada', 'Bela', 'Cleo', 'Dora', 'Emil', 'Fanni', 'Gabor', 'Hanna', 'Imre', 'Jolan', 'Kata', 'Laszlo', 'Mira', 'Nora', 'Oszkar', 'Panni', 'Rita', 'Samu', 'Tibor', 'Vera', 'Zsof', 'Adam', 'Bence', 'Csilla', 'David', 'Eszter', 'Feri', 'Gergo', 'Hajni', 'Ildi'][k] + ' (bot)', DC.BOTS[k % DC.BOTS.length]);
    DC.open(Host.G, Host.expected + Host.G.nbots);
    hostBoot(false);
  };
}
function hostResume(room, saved) {
  Host.room = room; Host.G = saved.G; Host.bi = saved.bi; Host.url = saved.url; Host.pubBase = saved.pubBase; Host.paused = saved.paused; Host.remain = saved.remain; Host.nsOff = saved.nsOff || 1000; Host.brk = saved.brk || null; Host.bu = saved.bu; Host.ns = Date.now() + 1500; Host.dirtyHx = true;
  hostBoot(true);
}
function hostEntry(P) { const r = (P.get('r') || '').toUpperCase(); const s = r && hostLoad(r); if (s && s.G) hostResume(r, s); else hostSetupView(); }
function hostBoot(resumed) {
  hostConnect(); try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => Host.wake = w).catch(() => { }); } catch (e) { }
  clearInterval(Host.iv); clearInterval(Host.iv2); clearInterval(Host.iv3);
  Host.iv = setInterval(hostLoop, 300); Host.iv2 = setInterval(hostAutosave, 6000); Host.iv3 = setInterval(() => { if (Host.G) renderHostLive(); }, 1000);
  location.hash = 'host=1&r=' + Host.room;
  Host.started = Host.G.ph !== 'prep'; Host.endShown = false;
  document.removeEventListener('click', hostClick); document.addEventListener('click', hostClick);
  renderHost(true);
}
function renderHostChrome() { const c = $('#hconn'); if (c) { c.className = 'conn ' + (Host.st === 'up' ? 'ok' : Host.st === 'err' ? 'bad' : ''); c.title = 'Relay: ' + Host.st; } }

function renderHost(full) {
  const G = Host.G; if (!G) return;
  const app = $('#app');
  if (G.ph === 'prep') { renderLobby(); return; }
  if (G.ph === 'end' && !Host.endShown) { Host.endShown = true; Host.tab = 'res'; full = true; }
  if (full || !$('#hbody')) {
    app.innerHTML = '<header class="top"><div class="mq" id="mq" aria-label="Live prices"></div><div class="wrap"><div class="brand">Disruption Cycle<small>Capital Markets · host</small></div>' +
      '<div class="clock"><div class="small mono" id="hclk"></div><div class="bar"><i id="hbar" style="width:0%"></i></div></div>' +
      '<div class="kpi"><b id="hon">0</b><span>online</span></div><div class="kpi"><b id="hvol">€0</b><span>invested</span></div><span class="spacer"></span><span id="hconn" class="conn" title=""></span>' +
      '<div class="row" id="hctl"></div></div><div class="wrap"><div class="tabs" id="htabs"></div></div></header><div id="hann"></div><main class="wrap main"><div id="hbody"></div></main>';
    renderHostChrome();
  }
  $('#htabs').innerHTML = [['board', 'Market board'], ['class', 'Class & participation'], ['proj', 'Company & fund detail'], ['ctl', 'Controls'], ['res', 'Final results']].map(t => '<button class="tab' + (Host.tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('');
  $$('#htabs .tab').forEach(b => b.onclick = () => { Host.tab = b.dataset.t; renderHost(); });
  $('#hctl').innerHTML = '<button class="btn sm" id="bQ">📱 Join QR</button>' + (G.ph === 'run' || G.ph === 'pause' ? '<button class="btn sm" id="bP">' + (G.ph === 'pause' ? 'Resume' : 'Pause') + '</button><button class="btn sm" id="bN">Next year</button>' : '') + (G.ph === 'end' ? '<span class="chip good">Game over</span>' : '');
  const bQ = $('#bQ'); if (bQ) bQ.onclick = showJoinQR; const bP = $('#bP'); if (bP) bP.onclick = hostPause; const bN = $('#bN'); if (bN) bN.onclick = hostTickNow;
  renderHostLive(true);
}
function boardCards(pub, tk, G) {
  const all = G.pr.concat(G.fi); let h = '';
  for (let i = 0; i < DC.NA; i++) {
    const d = DC.ALL[i], P = pub.P[i], pp = pub.pp ? pub.pp[i] : P, base = i < DC.NP ? (tk.pr[i].ph[0] || P) : 100, so = P / base - 1, lab = projLabel(i, tk), live = i >= DC.NP || tk.pr[i].st === 'live';
    const b = buildCandles(all[i].cd, live && pub.cb && pub.ph !== 'prep' ? pub.cb[i] : null, Math.min(pub.t + 1, pub.T), 'live', [], 30);
    h += '<div class="mcard" data-i="' + i + '"><div class="row"><b>' + d.code + '</b><span class="small muted">' + esc(d.name) + '</span><span class="spacer"></span><span class="chip ' + lab.c + '">' + lab.t + '</span></div>' +
      '<div class="row" style="align-items:baseline;gap:10px"><b class="mono" style="font-size:20px">€' + px(P) + '</b>' + (live ? chgHTML(P, pp) : '') + '<span class="spacer"></span><span class="small mono ' + cls(so) + '">' + pct(so, 1) + '</span></div>' +
      candleChart({ cs: b.cs, marks: [], xl: [], slots: 30, w: 300, h: 120, floor0: true, minRange: P * 0.015, last: P, label: d.name + ' price candles' }) + '</div>';
  }
  return h;
}
function hostModal() {
  const G = Host.G; let m = $('#hmod');
  if (Host.mod == null || !G || G.ph === 'prep') { if (m) m.remove(); return; }
  const pub = pubOf(), tk = DC.tk(G), i = Host.mod;
  if (!m) { m = document.createElement('div'); m.className = 'modal'; m.id = 'hmod'; m.innerHTML = '<div class="mbox wide"><div class="row" style="justify-content:flex-end;width:100%"><button class="btn sm" id="hmx">Close ✕</button></div><div id="hmb" style="width:100%;text-align:left"></div></div>'; m.onclick = e => { if (e.target === m || e.target.id === 'hmx') { Host.mod = null; m.remove(); } }; document.body.appendChild(m); }
  const bx = $('#hmb'), st = bx.parentNode.scrollTop; bx.innerHTML = (i >= DC.NP ? fiTop : detailTop)(i, pub, tk, null, true, { tf: Host.tf, bars: G.pr.concat(G.fi).map(p => p.cd) }); bx.parentNode.scrollTop = st;
}
function pubOf() { return DC.pub(Host.G); }
function renderHostLive(force) {
  const G = Host.G, body = $('#hbody'); if (!G || !body || G.ph === 'prep') { if (G && G.ph === 'prep') renderLobbyLive(); return; }
  const pub = pubOf(), tk = DC.tk(G); updateTape($('#mq'), pub, tk);
  const left = G.ph === 'run' ? Math.max(0, hostTE() - Date.now()) : Host.paused ? Host.remain : 0;
  $('#hclk').textContent = G.ph === 'end' ? 'Game over' : Host.brk && G.ph === 'pause' ? (Host.brk.ev ? 'MAJOR NEWS' : 'PLANNING BREAK') + ' · year ' + Math.min(G.t + 1, G.T) + ' starts in ' + mmss(Host.brk.until - Date.now()) : (G.ph === 'pause' ? 'PAUSED · ' : '') + 'Year ' + Math.min(G.t + 1, G.T) + ' / ' + G.T + ' · ' + mmss(left);
  $('#hbar').style.width = (G.ph === 'end' ? 100 : 100 - left / ((G.yl || G.cfg.tickSec) * 1000) * 100) + '%';
  $('#hon').textContent = G.ord.filter(id => !G.pl[id].bot && humanOnline(id)).length + '/' + G.ord.filter(id => !G.pl[id].bot).length;
  let inv = 0; for (const id of G.ord) { const pl = G.pl[id]; for (let i = 0; i < DC.NA; i++) inv += pl.hold[i] * (i < DC.NP ? G.pr[i].P : G.fi[i - DC.NP].P); } $('#hvol').textContent = eurK(inv);
  const ha = $('#hann'); if (ha) { const hh = G.ph === 'pause' && Host.brk ? annHTML({ t: G.t, bk: Host.brk.until, mj: Host.brk.ev ? G.maj : [] }, Host.annOpen !== false, Date.now()) : ''; if (ha.dataset.k !== hh) { ha.innerHTML = hh; ha.dataset.k = hh; } }
  const tab = Host.tab; hostModal();
  if (tab === 'board') {
    const lb = pub.top; body.innerHTML = '<div class="brow"><div class="panel"><h2>Headlines</h2><div class="pb">' + newsFeed(G.news, 8) + '</div></div><div class="panel"><h2>Live trades</h2><div class="pb">' + tapeFeed(pub) + '</div></div></div><div class="panel" style="margin-top:14px"><h2>Market <span class="small faint">every price at a glance · click any chart to enlarge</span></h2><div class="pb"><div class="mgrid">' + boardCards(pub, tk, G) + '</div></div></div><div class="panel" style="margin-top:14px"><h2>Leaderboard</h2><div class="pb">' + leaderTable(lb, null) + '</div></div>';
    $$('#hbody .mcard').forEach(r => r.onclick = () => { Host.mod = +r.dataset.i; renderHostLive(true); });
  } else if (tab === 'class') {
    if (!force && body.dataset.tab === 'class' && G.ph === 'run' && Date.now() % 3000 > 1000) return;
    renderClassTab(body, G, pub, tk);
  } else if (tab === 'proj') {
    body.innerHTML = '<div class="cols"><div class="panel"><h2>Companies, bonds and index <span class="small faint">click a row</span></h2><div id="hmt">' + marketTable(pub, tk, { sel: Host.sel, key: 'p', host: true }) + '</div></div><div class="panel"><div id="hdt">' + (Host.sel >= DC.NP ? fiTop : detailTop)(Host.sel, pub, tk, null, true, { tf: Host.tf, bars: G.pr.concat(G.fi).map(p => p.cd) }) + '</div></div></div>';
    $$('#hmt tr.mk').forEach(r => r.onclick = () => { Host.sel = +r.dataset.i; renderHostLive(true); });
  } else if (tab === 'ctl') {
    if (body.dataset.tab === 'ctl' && !force) return; renderCtl(body, G);
  } else if (tab === 'res') {
    if (body.dataset.tab === 'res' && !force && !Host.dirtyRes) return; Host.dirtyRes = false;
    body.innerHTML = G.ph === 'end' ? '<div class="row" style="margin-bottom:10px"><button class="btn" data-act="csv">Download results (CSV)</button><span class="small muted">Project this screen: every investor, result and portfolio.</span></div>' + resultsHTML(tk, null, Host.openP) + debriefHTML(tk.db) : '<div class="panel"><div class="pb"><p>Final results appear when the game ends. You can end it early under Controls.</p></div></div>';
  }
  body.dataset.tab = tab;
}
function renderClassTab(body, G, pub, tk) {
  const alloc = [0, 0, 0, 0]; let tot = 0; for (const id of G.ord) { const pl = G.pl[id]; for (let i = 0; i < DC.NA; i++) { const v = pl.hold[i] * (i < DC.NP ? G.pr[i].P : G.fi[i - DC.NP].P); alloc[i < DC.NP ? G.pr[i].h - 1 : 3] += v; tot += v; } }
  const cash = G.ord.reduce((a, id) => a + G.pl[id].cash, 0);
  const rows = G.ord.map(id => { const pl = G.pl[id]; const nw = DC.netWorth(G, pl); const stuck = !pl.bot && G.t >= 2 && pl.tr === 0; const on = pl.bot ? true : humanOnline(id); const npos = pl.hold.filter(x => x > 0).length; return { pl, nw, stuck, on, npos }; }).sort((a, b) => (b.stuck - a.stuck) || (a.pl.tr - b.pl.tr));
  body.innerHTML = '<div class="cols"><div style="display:grid;gap:14px"><div class="panel"><h2>Where the class money sits</h2><div class="pb">' + stackBar([{ v: alloc[0], c: 'var(--h1)', l: 'Low risk (core)' }, { v: alloc[1], c: 'var(--h2)', l: 'Medium (adjacent)' }, { v: alloc[2], c: 'var(--h3)', l: 'High risk (breakthrough)' }, { v: alloc[3], c: 'var(--ink3)', l: 'Bonds & index' }, { v: cash, c: 'var(--line)', l: 'Cash' }]) + '<p class="small muted" style="margin-top:10px">Compare the invested part with the 70-20-10 rule from the lecture: 70% core, 20% adjacent, 10% breakthrough. Class cash holdings: ' + Math.round(cash / (cash + tot) * 100) + '%.</p></div></div>' +
    '<div class="panel"><h2>Herding check</h2><div class="pb"><p class="small muted">Share of class money in the three most held companies: <b>' + Math.round(topShare(G) * 100) + '%</b> (equal weights would be 25%).</p></div></div></div>' +
    '<div class="panel"><h2>Participation <span class="small faint">amber = no trade yet after year 2</span></h2><div style="max-height:560px;overflow:auto"><table class="tbl-sm"><thead><tr><th>Investor</th><th>Trades</th><th>Reports</th><th>Companies</th><th>Portfolio</th></tr></thead><tbody>' + rows.map(r => '<tr class="' + (r.stuck ? 'amber' : '') + '"><td style="text-align:left"><span class="conn ' + (r.on ? 'ok' : '') + '" style="margin-right:6px"></span>' + esc(r.pl.name) + (r.pl.bot ? ' <span class="chip">bot</span>' : '') + '</td><td>' + r.pl.tr + '</td><td>' + r.pl.ddn + '</td><td>' + r.npos + '</td><td>' + eurK(r.nw) + '</td></tr>').join('') + '</tbody></table></div></div></div>';
}
function topShare(G) { const byP = G.pr.map((p, i) => { let s = 0; for (const id of G.ord) s += G.pl[id].hold[i] * p.P; return s; }); const tot = byP.reduce((a, b) => a + b, 0) || 1; return byP.sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / tot; }
function renderCtl(body, G) {
  body.innerHTML = '<div class="cols"><div class="panel"><h2>Market controls</h2><div class="pb"><div class="row" style="margin-bottom:10px"><button class="btn" id="cP">' + (G.ph === 'pause' ? (Host.brk ? 'Start next year now' : 'Resume') : 'Pause market') + '</button><button class="btn" id="cN">Jump to year end now</button><button class="btn" id="cX15">+15 s this year</button><button class="btn sell" id="cE">End game now</button></div>' +
    '<h3 style="margin:14px 0 6px">Pauses</h3><div class="row"><label class="small"><input type="checkbox" id="cEv" ' + (G.cfg.evp ? 'checked' : '') + '> Pause on major news for</label><label class="small"><input id="cEs" type="number" min="5" max="120" value="' + (G.cfg.evSec || 15) + '" style="width:60px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"> seconds</label></div><h3 style="margin:10px 0 6px">Planning break between years</h3><div class="row"><label class="small"><input type="checkbox" id="cBk" ' + (G.cfg.brk ? 'checked' : '') + '> Pause at the end of every year</label><label class="small">for <input id="cBs" type="number" min="5" max="300" value="' + (G.cfg.brkSec || 30) + '" style="width:70px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"> seconds</label></div><p class="small muted">During a break prices are frozen and trading is closed. Students can read the news, the charts and their portfolio. Applies from the next year end.</p><h3 style="margin:14px 0 6px">Attention check</h3><div class="row"><button class="btn sm" data-tip="up">Fake “buy now” tip</button><button class="btn sm" data-tip="down">Fake “sell now” tip</button></div><p class="small muted">Publishes a dubious tip. The price spikes briefly and drifts back; the final results list who followed it.</p><h3 style="margin:14px 0 6px">Trigger a market event now</h3><p class="small muted">Use it as a teaching moment. Scheduled events already fire on their own (with a short warning headline first) if switched on.</p><div class="row"><button class="btn sm" data-e="hype">Deep-tech frenzy</button><button class="btn sm" data-e="winter">Funding winter</button><button class="btn sm" data-e="disrupt">Disruptor hits the core</button><button class="btn sm" data-e="rumour">Takeover rumour</button></div></div></div>' +
    '<div class="panel"><h2>Session</h2><div class="pb"><p class="small">Join code <b class="mono">' + esc(joinCode()) + '</b> · relay <span class="mono small">' + esc(Host.url) + '</span></p><p class="small muted">Relay status: ' + Host.st + (Host.stDetail ? ' (' + esc(Host.stDetail) + ')' : '') + '. If the relay drops, students reconnect on their own and everything resumes.</p><div style="margin:8px 0"><button class="btn sm" id="cQ">📱 Show join QR code</button></div><label class="small"><input type="checkbox" id="cA" ' + (G.cfg.anon ? 'checked' : '') + '> Hide names on the trade feed</label></div></div></div>';
  $('#cQ').onclick = showJoinQR; $('#cP').onclick = hostPause; $('#cN').onclick = hostTickNow; $('#cX15').onclick = () => { G.yl += 15; if (G.ph === 'pause') Host.remain += 15000; markAll(); toast('15 seconds added to this year'); }; $('#cE').onclick = () => { if (confirm('End the game now and pay out all companies?')) hostEndNow(); };
  $('#cEv').onchange = e => { G.cfg.evp = e.target.checked; }; $('#cEs').onchange = e => { G.cfg.evSec = Math.max(5, Math.min(120, +e.target.value || 15)); e.target.value = G.cfg.evSec; };
  $('#cBk').onchange = e => { G.cfg.brk = e.target.checked; }; $('#cBs').onchange = e => { G.cfg.brkSec = Math.max(5, Math.min(300, +e.target.value || 30)); e.target.value = G.cfg.brkSec; };
  $$('[data-tip]').forEach(b => b.onclick = () => { const i = DC.fakeTip(G, b.dataset.tip); Host.dirtyPub = Host.dirtyTk = true; toast(i == null ? 'No company left to tip' : 'Fake tip published'); });
  $$('[data-e]').forEach(b => b.onclick = () => { hostFire(b.dataset.e); toast('Event triggered'); }); $('#cA').onchange = e => { G.cfg.anon = e.target.checked; };
}
function renderLobby() {
  const G = Host.G, app = $('#app'); const link = joinLink();
  let qr = ''; try { const q = qrcode(0, 'M'); q.addData(link); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 0 }); } catch (e) { qr = ''; }
  app.innerHTML = '<div class="landing"><div class="hero" style="max-width:860px"><div class="eyebrow">Practice phase · prices frozen</div><h1>Students join and practise</h1><div class="grid2" style="margin-top:14px;align-items:start"><div class="card"><div class="eyebrow">Join code</div><div class="code">' + esc(joinCode()) + '</div><p class="small muted" style="margin-top:8px">Or open the link:</p><p class="mono small" style="word-break:break-all;user-select:all">' + esc(link) + '</p><div class="qr">' + qr + '</div></div><div class="card"><div class="row"><h3>Joined</h3><span class="chip" id="lcnt"></span><span class="chip good" id="lrdy"></span><span class="spacer"></span><span id="hconn" class="conn"></span></div><div class="users" id="lusers" style="margin-top:8px"></div><p class="small muted" style="margin-top:12px">Everyone has €100,000 of practice money. They can open companies, read the guide and try trades that do not count. Each student presses <b>I’m ready</b>. Start the market when you are happy; late joiners can still enter during the first years.</p><button class="btn pri" id="lstart" style="margin-top:6px">Start the market</button><p class="small faint" id="lnote" style="margin-top:6px"></p></div></div></div></div>';
  $('#lstart').onclick = () => { const hs = G.ord.filter(id => !G.pl[id].bot), rd = hs.filter(id => G.pl[id].rdy).length; if (rd < hs.length && !confirm('Only ' + rd + ' of ' + hs.length + ' students are ready. Start the market anyway?')) return; hostStart(); };
  renderHostChrome(); renderLobbyLive();
}
function renderLobbyLive() {
  const G = Host.G, u = $('#lusers'); if (!u) return; const hs = G.ord.filter(id => !G.pl[id].bot), rd = hs.filter(id => G.pl[id].rdy).length;
  u.innerHTML = hs.map(id => '<span class="pill' + (G.pl[id].rdy ? ' rdy' : humanOnline(id) ? '' : ' off') + '">' + (G.pl[id].rdy ? '✓ ' : '') + esc(G.pl[id].name) + '</span>').join('') || '<span class="faint small">Waiting for the first student…</span>';
  $('#lcnt').textContent = hs.length + (G.nbots ? ' + ' + G.nbots + ' bots' : ''); $('#lrdy').textContent = rd + ' ready';
  const all = hs.length > 0 && rd === hs.length; const b = $('#lstart'); b.textContent = all ? 'Everyone is ready: start the market' : 'Start the market (' + rd + ' of ' + hs.length + ' ready)';
  $('#lnote').textContent = hs.length === 0 ? 'Waiting for students to join.' : all ? '' : 'You can start before everyone is ready; the button asks you to confirm.';
  renderHostChrome();
}
function showJoinQR() {
  const link = joinLink(); let qr = ''; try { const q = qrcode(0, 'M'); q.addData(link); q.make(); qr = q.createSvgTag({ cellSize: 9, margin: 0 }); } catch (e) { }
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'qrm';
  m.innerHTML = '<div class="mbox"><div class="eyebrow">Join the game</div><div class="code">' + esc(joinCode()) + '</div><div class="qr big">' + qr + '</div><p class="mono small" style="word-break:break-all;user-select:all;margin-top:10px">' + esc(link) + '</p><p class="small muted">Students who lost connection can also tap “Reconnect” on their own screen.</p><button class="btn pri" id="qrx">Close</button></div>';
  m.onclick = e => { if (e.target === m || e.target.id === 'qrx') m.remove(); }; document.body.appendChild(m);
}
function hostClick(e) {
  const t = e.target.closest('[data-act]'); if (!t || !Host.G) return; const a = t.dataset.act;
  if (a === 'ann') { Host.annOpen = Host.annOpen === false; $('#hann').dataset.k = ''; renderHostLive(true); }
  else if (a === 'tf') { Host.tf = t.dataset.m; renderHostLive(true); }
  else if (a === 'px') { const k = +t.dataset.k; if (Host.openP.has(k)) Host.openP.delete(k); else Host.openP.add(k); Host.dirtyRes = true; renderHostLive(true); }
  else if (a === 'goto') { Host.sel = +t.dataset.i; Host.tab = 'proj'; renderHost(); }
  else if (a === 'csv') { const tk = DC.tk(Host.G); if (!tk.fin) return; const blob = new Blob(['﻿' + resultsCSV(tk)], { type: 'text/csv' }), l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'disruption-cycle-results-' + Host.room + '.csv'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(l.href); l.remove(); }, 500); }
}

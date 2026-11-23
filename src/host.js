/* host console: authoritative market maker running in the facilitator's browser */
const Host = { G: null, net: null, room: '', url: '', bi: 0, st: 'down', dirtyPub: true, dirtyTk: true, dirtyPriv: new Set(), tab: 'board', sel: 0, setup: null, pubBase: '', started: false, paused: false, remain: 0, sawAt: {}, wake: null };

function hostSave() { try { localStorage.setItem('dcap-host-' + Host.room, JSON.stringify({ G: Host.G, bi: Host.bi, bu: Host.bu, url: Host.url, pubBase: Host.pubBase, te: Host.G.te, paused: Host.paused, remain: Host.remain })); localStorage.setItem('dcap-host-last', Host.room); } catch (e) { } }
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
    if (m.k === 'hi') { Host.dirtyPriv.add(id); Host.dirtyPub = Host.dirtyTk = true; }
    return;
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
  if (Host.dirtyTk) { Host.dirtyTk = false; n.send('tk', Object.assign(DC.tk(G), { te: G.te || 0, ts: Date.now(), pz: Host.paused ? Host.remain : 0 })); }
  if (Host.dirtyPub) { Host.dirtyPub = false; n.send('pub', Object.assign(DC.pub(G), { te: G.te || 0, ts: Date.now(), pz: Host.paused ? 1 : 0 })); }
  for (const id of Host.dirtyPriv) { const p = DC.priv(G, id); if (p) n.send('u/' + id, p); }
  Host.dirtyPriv.clear();
}
function hostStart() {
  const G = Host.G; DC.start(G); G.te = Date.now() + G.cfg.tickSec * 1000; Host.started = true; Host.paused = false;
  markAll(); hostSave(); renderHost();
}
function markAll() { Host.dirtyPub = Host.dirtyTk = true; Host.G.ord.forEach(id => Host.dirtyPriv.add(id)); }
function hostTickNow() {
  const G = Host.G; if (G.ph !== 'run') return;
  DC.advance(G); G.te = G.ph === 'run' ? Date.now() + G.cfg.tickSec * 1000 : 0;
  markAll(); hostSave(); renderHost();
}
function hostPause() { const G = Host.G; if (G.ph === 'run') { G.ph = 'pause'; Host.paused = true; Host.remain = Math.max(0, G.te - Date.now()); } else if (G.ph === 'pause') { G.ph = 'run'; Host.paused = false; G.te = Date.now() + Host.remain; } markAll(); hostSave(); renderHost(); }
function hostEndNow() { const G = Host.G; if (G.ph === 'pause') { G.ph = 'run'; Host.paused = false; } let guard = 40; while (G.ph === 'run' && guard--) DC.advance(G); G.te = 0; markAll(); hostSave(); renderHost(); }
function hostFire(k) { const G = Host.G; const news = []; DC.fire(G, k, news); DC.recomputeAll(G); news.forEach(x => G.news.unshift({ t: G.t, x })); Host.dirtyTk = Host.dirtyPub = true; renderHost(); }
function hostLoop() {
  const G = Host.G; if (!G) return;
  const now = Date.now();
  if (G.ph === 'run' && G.te && now >= G.te) hostTickNow();
  // bots
  if (G.ph === 'run') {
    for (const id of G.ord) {
      const pl = G.pl[id]; if (!pl.bot) continue;
      if (Math.random() < 1.2 / G.cfg.tickSec) { DC.botAct(G, pl, Math.random); Host.dirtyPub = true; }
    }
  }
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
    '<p class="muted">Your browser runs the market. Students connect through a free public relay, so nothing needs renting. Keep this tab open and in the foreground during the game.</p>' +
    (saved && saved.G && saved.G.ph !== 'end' ? '<div class="card" style="margin-top:14px"><h3>Resume previous session</h3><p class="small muted">Room ' + esc(last) + ', year ' + saved.G.t + ' of ' + saved.G.T + ', ' + saved.G.ord.length + ' investors.</p><button class="btn pri" id="resume">Resume</button></div>' : '') +
    '<div class="card" style="margin-top:14px"><div class="grid2"><div class="field"><label>Years (ticks)</label><input id="sT" type="number" min="8" max="24" value="14"></div><div class="field"><label>Seconds per year</label><input id="sS" type="number" min="20" max="240" value="75"></div></div>' +
    '<div class="grid2"><div class="field"><label>Market bots (fill thin markets)</label><input id="sB" type="number" min="0" max="30" value="0"></div><div class="field"><label>Expected students</label><input id="sN" type="number" min="1" max="120" value="30"></div></div>' +
    '<div class="field"><label>Relay</label><select id="sR">' + BROKERS.map((b, i) => '<option value="' + i + '">' + b.n + '</option>').join('') + '<option value="local">Same browser only (rehearsal)</option><option value="custom">My own broker (wss://…)</option></select></div>' +
    '<div class="field hide" id="cu"><label>Broker URL</label><input id="sU" placeholder="wss://example.hivemq.cloud:8884/mqtt"></div>' +
    '<div class="field"><label>Address students will open</label><input id="sA" value="' + esc(isFile ? '' : location.href.split('#')[0]) + '" placeholder="https://… (where you published this file)"></div>' +
    (isFile ? '<div class="note warn">This file is opened from your computer, so phones cannot reach it. Publish it on any free static host first (see the guide), then open it from that address.</div>' : '') +
    '<div class="row"><label class="small"><input type="checkbox" id="sE" checked> Scheduled market news</label><label class="small"><input type="checkbox" id="sX"> Hide names on trade feed</label></div>' +
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
    const cfg = { T: Math.max(8, Math.min(24, +$('#sT').value || 14)), tickSec: Math.max(20, Math.min(240, +$('#sS').value || 75)), events: $('#sE').checked, anon: $('#sX').checked };
    Host.G = DC.newGame(cfg, Host.room + Date.now()); Host.G.nbots = Math.max(0, Math.min(30, +$('#sB').value || 0)); Host.expected = +$('#sN').value || 30;
    for (let k = 0; k < Host.G.nbots; k++) DC.addPlayer(Host.G, 'bot' + k, ['Ada', 'Bela', 'Cleo', 'Dora', 'Emil', 'Fanni', 'Gabor', 'Hanna', 'Imre', 'Jolan', 'Kata', 'Laszlo', 'Mira', 'Nora', 'Oszkar', 'Panni', 'Rita', 'Samu', 'Tibor', 'Vera', 'Zsof', 'Adam', 'Bence', 'Csilla', 'David', 'Eszter', 'Feri', 'Gergo', 'Hajni', 'Ildi'][k] + ' (bot)', DC.BOTS[k % DC.BOTS.length]);
    hostBoot(false);
  };
}
function hostResume(room, saved) {
  Host.room = room; Host.G = saved.G; Host.bi = saved.bi; Host.url = saved.url; Host.pubBase = saved.pubBase; Host.paused = saved.paused; Host.remain = saved.remain; Host.bu = saved.bu;
  if (Host.G.ph === 'run' && (!Host.G.te || Host.G.te < Date.now())) Host.G.te = Date.now() + 5000;
  hostBoot(true);
}
function hostEntry(P) { const r = (P.get('r') || '').toUpperCase(); const s = r && hostLoad(r); if (s && s.G) hostResume(r, s); else hostSetupView(); }
function hostBoot(resumed) {
  hostConnect(); try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => Host.wake = w).catch(() => { }); } catch (e) { }
  clearInterval(Host.iv); clearInterval(Host.iv2); clearInterval(Host.iv3);
  Host.iv = setInterval(hostLoop, 300); Host.iv2 = setInterval(hostAutosave, 6000); Host.iv3 = setInterval(() => { if (Host.G) renderHostLive(); }, 1000);
  location.hash = 'host=1&r=' + Host.room;
  Host.started = Host.G.ph !== 'lobby';
  renderHost(true);
}
function renderHostChrome() { const c = $('#hconn'); if (c) { c.className = 'conn ' + (Host.st === 'up' ? 'ok' : Host.st === 'err' ? 'bad' : ''); c.title = 'Relay: ' + Host.st; } }

function renderHost(full) {
  const G = Host.G; if (!G) return;
  const app = $('#app');
  if (G.ph === 'lobby') { renderLobby(); return; }
  if (full || !$('#hbody')) {
    app.innerHTML = '<header class="top"><div class="wrap"><div class="brand">Disruption Cycle<small>Capital Markets · host</small></div>' +
      '<div class="clock"><div class="small mono" id="hclk"></div><div class="bar"><i id="hbar" style="width:0%"></i></div></div>' +
      '<div class="kpi"><b id="hon">0</b><span>online</span></div><div class="kpi"><b id="hvol">€0</b><span>invested</span></div><span class="spacer"></span><span id="hconn" class="conn" title=""></span>' +
      '<div class="row" id="hctl"></div></div><div class="wrap"><div class="tabs" id="htabs"></div></div></header><main class="wrap main"><div id="hbody"></div></main>';
    renderHostChrome();
  }
  $('#htabs').innerHTML = [['board', 'Market board'], ['class', 'Class & participation'], ['proj', 'Project detail'], ['ctl', 'Controls'], ['debrief', 'Debrief']].map(t => '<button class="tab' + (Host.tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('');
  $$('#htabs .tab').forEach(b => b.onclick = () => { Host.tab = b.dataset.t; renderHost(); });
  $('#hctl').innerHTML = (G.ph === 'run' || G.ph === 'pause' ? '<button class="btn sm" id="bP">' + (G.ph === 'pause' ? 'Resume' : 'Pause') + '</button><button class="btn sm" id="bN">Next year</button>' : '') + (G.ph === 'end' ? '<span class="chip good">Game over</span>' : '');
  const bP = $('#bP'); if (bP) bP.onclick = hostPause; const bN = $('#bN'); if (bN) bN.onclick = hostTickNow;
  renderHostLive(true);
}
function pubOf() { return DC.pub(Host.G); }
function renderHostLive(force) {
  const G = Host.G, body = $('#hbody'); if (!G || !body || G.ph === 'lobby') { if (G && G.ph === 'lobby') renderLobbyLive(); return; }
  const pub = pubOf(), tk = DC.tk(G);
  const left = G.ph === 'run' ? Math.max(0, G.te - Date.now()) : Host.paused ? Host.remain : 0;
  $('#hclk').textContent = G.ph === 'end' ? 'Final settlement' : (G.ph === 'pause' ? 'PAUSED · ' : '') + 'Year ' + G.t + ' / ' + G.T + ' · ' + mmss(left);
  $('#hbar').style.width = (G.ph === 'end' ? 100 : 100 - left / (G.cfg.tickSec * 1000) * 100) + '%';
  $('#hon').textContent = G.ord.filter(id => !G.pl[id].bot && humanOnline(id)).length + '/' + G.ord.filter(id => !G.pl[id].bot).length;
  let inv = 0; for (const id of G.ord) { const pl = G.pl[id]; for (let i = 0; i < DC.NP; i++) inv += pl.hold[i] * G.pr[i].P; } $('#hvol').textContent = eurK(inv);
  const tab = Host.tab;
  if (tab === 'board') {
    const lb = pub.top; body.innerHTML = '<div class="cols"><div class="panel big"><h2>Market</h2>' + marketTable(pub, tk, { sel: -1 }) + '</div><div style="display:grid;gap:14px"><div class="panel"><h2>Headlines</h2><div class="pb">' + newsFeed(tk, 5) + '</div></div><div class="panel"><h2>Leaders</h2><div class="pb">' + leaderTable(lb, null) + '</div></div><div class="panel"><h2>Live trades</h2><div class="pb">' + tapeFeed(pub) + '</div></div></div></div>';
  } else if (tab === 'class') {
    if (!force && body.dataset.tab === 'class' && G.ph === 'run' && Date.now() % 3000 > 1000) return;
    renderClassTab(body, G, pub, tk);
  } else if (tab === 'proj') {
    body.innerHTML = '<div class="cols"><div class="panel"><h2>Projects</h2><div id="hmt">' + marketTable(pub, tk, { sel: Host.sel }) + '</div></div><div class="panel"><div id="hdt">' + detailTop(Host.sel, pub, tk, null, true) + '</div></div></div>';
    $$('#hmt tr.mk').forEach(r => r.onclick = () => { Host.sel = +r.dataset.i; renderHostLive(true); });
  } else if (tab === 'ctl') {
    if (body.dataset.tab === 'ctl' && !force) return; renderCtl(body, G);
  } else if (tab === 'debrief') {
    if (body.dataset.tab === 'debrief' && !force) return;
    body.innerHTML = G.ph === 'end' ? debriefHTML(tk.db) + '<div class="panel" style="margin-top:14px"><h2>Final standings</h2><div class="pb">' + leaderTable(tk.lbAll.slice(0, 15), null) + '</div></div>' : '<div class="panel"><div class="pb"><p>The debrief appears when the game ends. You can end it early under Controls.</p></div></div>';
  }
  body.dataset.tab = tab;
}
function renderClassTab(body, G, pub, tk) {
  const alloc = [0, 0, 0]; let tot = 0; for (const id of G.ord) { const pl = G.pl[id]; for (let i = 0; i < DC.NP; i++) { const v = pl.hold[i] * G.pr[i].P; alloc[G.pr[i].h - 1] += v; tot += v; } }
  const cash = G.ord.reduce((a, id) => a + G.pl[id].cash, 0);
  const rows = G.ord.map(id => { const pl = G.pl[id]; const nw = DC.netWorth(G, pl); const stuck = !pl.bot && G.t >= 2 && pl.tr === 0; const on = pl.bot ? true : humanOnline(id); const npos = pl.hold.filter(x => x > 0).length; return { pl, nw, stuck, on, npos }; }).sort((a, b) => (b.stuck - a.stuck) || (a.pl.tr - b.pl.tr));
  body.innerHTML = '<div class="cols"><div style="display:grid;gap:14px"><div class="panel"><h2>Where the class capital sits</h2><div class="pb">' + stackBar([{ v: alloc[0], c: 'var(--h1)', l: 'Core' }, { v: alloc[1], c: 'var(--h2)', l: 'Adjacent' }, { v: alloc[2], c: 'var(--h3)', l: 'Breakthrough' }, { v: cash, c: 'var(--line)', l: 'Cash' }]) + '<p class="small muted" style="margin-top:10px">Compare the invested part with the 70-20-10 rule from the lecture: 70% core, 20% adjacent, 10% breakthrough. Class cash holdings: ' + Math.round(cash / (cash + tot) * 100) + '%.</p></div></div>' +
    '<div class="panel"><h2>Herding check</h2><div class="pb"><p class="small muted">Share of class capital in the three most held projects: <b>' + Math.round(topShare(G) * 100) + '%</b> (equal weights would be 25%).</p></div></div></div>' +
    '<div class="panel"><h2>Participation <span class="small faint">amber = no trade yet after year 2</span></h2><div style="max-height:560px;overflow:auto"><table class="tbl-sm"><thead><tr><th>Investor</th><th>Trades</th><th>DD</th><th>Projects</th><th>Net worth</th></tr></thead><tbody>' + rows.map(r => '<tr class="' + (r.stuck ? 'amber' : '') + '"><td style="text-align:left"><span class="conn ' + (r.on ? 'ok' : '') + '" style="margin-right:6px"></span>' + esc(r.pl.name) + (r.pl.bot ? ' <span class="chip">bot</span>' : '') + '</td><td>' + r.pl.tr + '</td><td>' + r.pl.ddn + '</td><td>' + r.npos + '</td><td>' + eurK(r.nw) + '</td></tr>').join('') + '</tbody></table></div></div></div>';
}
function topShare(G) { const byP = G.pr.map((p, i) => { let s = 0; for (const id of G.ord) s += G.pl[id].hold[i] * p.P; return s; }); const tot = byP.reduce((a, b) => a + b, 0) || 1; return byP.sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / tot; }
function renderCtl(body, G) {
  body.innerHTML = '<div class="cols"><div class="panel"><h2>Market controls</h2><div class="pb"><div class="row" style="margin-bottom:10px"><button class="btn" id="cP">' + (G.ph === 'pause' ? 'Resume' : 'Pause market') + '</button><button class="btn" id="cN">Advance one year now</button><button class="btn" id="cX15">+15 s on the clock</button><button class="btn sell" id="cE">End game now</button></div>' +
    '<h3 style="margin:14px 0 6px">Trigger a market event now</h3><p class="small muted">Use it as a teaching moment. Scheduled events already fire on their own if switched on.</p><div class="row"><button class="btn sm" data-e="hype">Deep-tech frenzy</button><button class="btn sm" data-e="winter">Funding winter</button><button class="btn sm" data-e="disrupt">Disruptor hits the core</button><button class="btn sm" data-e="rumour">Acquisition rumour</button></div></div></div>' +
    '<div class="panel"><h2>Session</h2><div class="pb"><p class="small">Join code <b class="mono">' + esc(joinCode()) + '</b> · relay <span class="mono small">' + esc(Host.url) + '</span></p><p class="small muted">Relay status: ' + Host.st + (Host.stDetail ? ' (' + esc(Host.stDetail) + ')' : '') + '. If the relay drops, students reconnect on their own and everything resumes.</p><label class="small"><input type="checkbox" id="cA" ' + (G.cfg.anon ? 'checked' : '') + '> Hide names on the trade feed</label></div></div></div>';
  $('#cP').onclick = hostPause; $('#cN').onclick = hostTickNow; $('#cX15').onclick = () => { if (G.ph === 'run') G.te += 15000; else Host.remain += 15000; markAll(); }; $('#cE').onclick = () => { if (confirm('End the game now and settle all projects?')) hostEndNow(); };
  $$('[data-e]').forEach(b => b.onclick = () => { hostFire(b.dataset.e); toast('Event triggered'); }); $('#cA').onchange = e => { G.cfg.anon = e.target.checked; };
}
function renderLobby() {
  const G = Host.G, app = $('#app'); const link = joinLink();
  let qr = ''; try { const q = qrcode(0, 'M'); q.addData(link); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 0 }); } catch (e) { qr = ''; }
  app.innerHTML = '<div class="landing"><div class="hero" style="max-width:820px"><div class="eyebrow">Lobby open</div><h1>Students join now</h1><div class="grid2" style="margin-top:14px;align-items:start"><div class="card"><div class="eyebrow">Join code</div><div class="code">' + esc(joinCode()) + '</div><p class="small muted" style="margin-top:8px">Or open the link:</p><p class="mono small" style="word-break:break-all;user-select:all">' + esc(link) + '</p><div class="qr">' + qr + '</div></div><div class="card"><div class="row"><h3>Joined</h3><span class="chip" id="lcnt"></span><span class="spacer"></span><span id="hconn" class="conn"></span></div><div class="users" id="lusers" style="margin-top:8px"></div><p class="small muted" style="margin-top:12px">Everyone starts with €100,000. The market opens when you press Start. Latecomers can still join in the first years.</p><button class="btn pri" id="lstart" style="margin-top:6px">Start the market</button></div></div></div></div>';
  $('#lstart').onclick = () => { if (confirm('Start the market with ' + G.ord.length + ' investors?')) hostStart(); };
  renderHostChrome(); renderLobbyLive();
}
function renderLobbyLive() { const G = Host.G, u = $('#lusers'); if (!u) return; const hs = G.ord.filter(id => !G.pl[id].bot); u.innerHTML = hs.map(id => '<span class="pill' + (humanOnline(id) ? '' : ' off') + '">' + esc(G.pl[id].name) + '</span>').join('') || '<span class="faint small">Waiting for the first student…</span>'; $('#lcnt').textContent = hs.length + (G.nbots ? ' + ' + G.nbots + ' bots' : ''); renderHostChrome(); }

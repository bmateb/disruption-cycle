/* transport: MQTT over WebSocket through a free public broker, or BroadcastChannel for same-browser rehearsal */
const BROKERS = [
  { n: 'EMQX public', u: 'wss://broker.emqx.io:8084/mqtt' },
  { n: 'HiveMQ public', u: 'wss://broker.hivemq.com:8884/mqtt' },
  { n: 'Mosquitto test', u: 'wss://test.mosquitto.org:8081' },
];
const NS = 'dcap1/';
function rid(n) { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const a = new Uint8Array(n); (crypto || msCrypto).getRandomValues(a); for (const b of a) s += c[b % c.length]; return s; }
function roomCode() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; const a = new Uint8Array(5); crypto.getRandomValues(a); for (const b of a) s += c[b % c.length]; return s; }

function netOpen(o) { // {url, room, subs, onMsg(topic,obj), onState(state,detail)}
  const base = NS + o.room + '/';
  if (o.url === 'local') {
    const ch = new BroadcastChannel('dcap-' + o.room); const subs = new Set(o.subs);
    ch.onmessage = e => { const d = e.data; if (subs.has(d.t)) o.onMsg(d.t, d.m); };
    setTimeout(() => o.onState('up'), 0);
    return { send: (t, m) => ch.postMessage({ t, m: JSON.parse(JSON.stringify(m)) }), close: () => ch.close(), url: 'local' };
  }
  const c = mqtt.connect(o.url, { clientId: 'dc' + rid(10), clean: true, keepalive: 25, reconnectPeriod: 1500, connectTimeout: 9000, resubscribe: true });
  c.on('connect', () => { c.subscribe(o.subs.map(t => base + t), { qos: 0 }, err => { if (err) o.onState('err', String(err)); else o.onState('up'); }); });
  c.on('close', () => o.onState('down'));
  c.on('offline', () => o.onState('down'));
  c.on('error', e => o.onState('err', e && e.message));
  c.on('message', (t, m) => { try { o.onMsg(t.slice(base.length), JSON.parse(m.toString())); } catch (e) { } });
  return { send: (t, m, qos) => { if (c.connected) c.publish(base + t, JSON.stringify(m), { qos: qos || 0 }); }, close: () => c.end(true), url: o.url, client: c };
}

function brokerTest(url, ms) { // resolves {ok, rtt}
  return new Promise(res => {
    if (url === 'local') return res({ ok: true, rtt: 0 });
    let done = false, c; const t0 = performance.now();
    const fin = r => { if (done) return; done = true; try { c && c.end(true); } catch (e) { } res(r); };
    try {
      c = mqtt.connect(url, { clientId: 'dct' + rid(8), clean: true, reconnectPeriod: 0, connectTimeout: ms || 7000 });
      const topic = NS + 'test/' + rid(8);
      c.on('connect', () => c.subscribe(topic, { qos: 0 }, err => { if (err) return fin({ ok: false, err: String(err) }); c.publish(topic, 'x', { qos: 0 }); }));
      c.on('message', () => fin({ ok: true, rtt: Math.round(performance.now() - t0) }));
      c.on('error', e => fin({ ok: false, err: e && e.message || 'error' }));
      setTimeout(() => fin({ ok: false, err: 'timeout' }), (ms || 7000) + 1500);
    } catch (e) { fin({ ok: false, err: String(e) }); }
  });
}
function brokerUrl(P) { // from hash params
  if (P.get('bu')) return P.get('bu');
  const b = P.get('b'); if (b === 'local') return 'local';
  const i = parseInt(b || '0', 10); return (BROKERS[i] || BROKERS[0]).u;
}

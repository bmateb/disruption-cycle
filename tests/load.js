const mqtt=require('/tmp/claude-0/-home-claude/747d27db-7c5d-579f-857d-32c42d7dd09c/scratchpad/cap/node_modules/mqtt');
const room=process.argv[2], N=+process.argv[3]||40, secs=+process.argv[4]||45; const base='dcap1/'+room+'/';
let lat=[],pubs=0,bytes=0,rej=0,ok=0; const cl=[];
for(let i=0;i<N;i++){
  const id='ld'+i,tok='tok'+i; const c=mqtt.connect('ws://localhost:8083/mqtt',{clientId:'ld'+i+Math.random()});
  const me={c,id,tok,sq:Date.now(),sent:0,prices:null,priv:null,cash:100000,t0:0};
  c.on('connect',()=>{c.subscribe([base+'pub',base+'tk',base+'u/'+id]);c.publish(base+'a',JSON.stringify({k:'hi',id,tok,name:'Load'+i}),{qos:1});});
  c.on('message',(t,m)=>{bytes+=m.length;const o=JSON.parse(m);if(t.endsWith('/pub')){pubs++;me.prices=o.P;}else if(t.includes('/u/')){me.priv=o;if(o.ack&&o.ack.sq===me.sq&&me.t0){lat.push(Date.now()-me.t0);me.t0=0;o.ack.ok?ok++:rej++;}}});
  cl.push(me);
}
setTimeout(()=>{const iv=setInterval(()=>{for(const me of cl){ if(!me.prices||!me.priv||me.t0) continue; if(Math.random()<0.5){const p=Math.floor(Math.random()*12);const buy=Math.random()<0.6||!me.priv.hold[p];me.sq++;me.t0=Date.now();me.c.publish(base+'a',JSON.stringify({k:'act',id:me.id,tok:me.tok,sq:me.sq,a:{k:buy?'b':'s',p,s:buy?20+Math.floor(Math.random()*150):Math.max(1,Math.floor(me.priv.hold[p]*0.5))}}),{qos:1});me.sent++;} }},1000);
 setTimeout(()=>{clearInterval(iv);setTimeout(()=>{lat.sort((a,b)=>a-b);const sent=cl.reduce((a,m)=>a+m.sent,0);console.log('clients',N,'actions sent',sent,'acked ok',ok,'rejected',rej,'lat p50',lat[Math.floor(lat.length/2)],'p95',lat[Math.floor(lat.length*0.95)],'max',lat[lat.length-1],'pubs received/client',(pubs/N/secs).toFixed(1)+'/s','KB/s/client',(bytes/N/secs/1024).toFixed(1));process.exit(0)},3000)},secs*1000)},4000);

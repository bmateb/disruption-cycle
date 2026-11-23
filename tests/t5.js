const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
const OUT=__dirname+'/';
(async()=>{
  const br=await chromium.launch(); const errs=[]; globalThis.__errs=errs;
  const mk=async(w,h,name)=>{const ctx=await br.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/WebSocket|ERR_/.test(m.text()))errs.push(name+' CONSOLE '+m.text())});p.on('dialog',d=>d.accept());return p;};
  const host=await mk(1400,900,'host');
  await host.goto(BASE+'#host=1'); await host.waitForSelector('#go');
  await host.selectOption('#sR','custom'); await host.fill('#sU',BU); await host.fill('#sT','8'); await host.fill('#sS','20'); await host.fill('#sB','4'); await host.fill('#sA',BASE);
  await host.click('#go'); await host.waitForSelector('#lstart',{timeout:20000});
  const link=await host.locator('.mono.small').first().innerText(); console.log('join link',link);
  const st=[];
  for(let i=0;i<5;i++){ const p=await mk(i===0?390:1200,i===0?800:850,'s'+i); await p.goto(link); await p.waitForSelector('#nm'); await p.fill('#nm','Student'+i); await p.click('#nb'); st.push(p); }
  // practice phase
  await st[1].waitForSelector('.prac',{timeout:15000}); console.log('practice banner:',(await st[1].locator('.prac').innerText()).replace(/\n/g,' | '));
  await host.waitForFunction(()=>document.querySelector('#lcnt').textContent.startsWith('5'),null,{timeout:15000});
  await st[1].click('[data-act="tab"][data-t="market"]'); await st[1].waitForSelector('tr.mk');
  const pr0=await st[1].locator('tr.mk[data-i="8"] td.pxc').innerText();
  await st[1].click('tr.mk[data-i="8"]'); await st[1].waitForSelector('#tgo'); await st[1].click('button[data-a="10000"]'); await st[1].click('#tgo');
  await st[1].waitForSelector('.toast:has-text("Practice")'); console.log('practice trade toast:',await st[1].locator('.toast').innerText());
  // a practice trade must not change the other student's price or the real portfolio
  await st[2].click('[data-act="tab"][data-t="market"]'); await st[2].waitForSelector('tr.mk'); const pr2=await st[2].locator('tr.mk[data-i="8"] td.pxc').innerText(); console.log('price on other device unchanged during practice:',pr0===pr2,pr0,pr2);
  await st[1].screenshot({path:OUT+'v2_practice.png'});
  // ready flow
  for(const p of st.slice(0,4)){ await p.click('button[data-act="rdy"]'); }
  await host.waitForFunction(()=>document.querySelector('#lrdy').textContent.startsWith('4'),null,{timeout:8000}); console.log('host sees ready:',await host.locator('#lrdy').innerText(), '|', (await host.locator('#lstart').innerText()));
  await host.screenshot({path:OUT+'v2_lobby.png'});
  await host.click('#lstart'); // confirm dialog auto-accepted
  for(const p of st) await p.waitForFunction(()=>!document.querySelector('.prac')&&/Year 1/.test(document.querySelector('#ck').textContent),null,{timeout:15000});
  console.log('market open on all:',await st[1].locator('#ck').innerText());
  // real portfolio untouched by practice
  await st[1].click('[data-act="tab"][data-t="port"]'); await st[1].waitForTimeout(500); console.log('portfolio after start has no practice shares:',/No shares yet/.test(await st[1].locator('#cbody').innerText()));
  await st[1].click('[data-act="tab"][data-t="market"]');
  // prices update every second: sample price cell over 6 s
  const seen=new Set(); const t0=Date.now(); while(Date.now()-t0<6500){ seen.add(await st[2].locator('tr.mk[data-i="3"] td.pxc').innerText()); await st[2].waitForTimeout(250); }
  console.log('distinct prices seen in 6.5 s for RELO:',Array.from(seen).join(','));
  console.log('change text:',(await st[2].locator('tr.mk[data-i="3"] .chg').innerText()));
  // trade moves price for others
  const pBefore=parseFloat(await st[2].locator('tr.mk[data-i="8"] td.pxc').innerText());
  await st[1].click('tr.mk[data-i="8"]'); await st[1].waitForSelector('#tgo'); await st[1].click('button[data-a="25000"]'); const tt=Date.now(); await st[1].click('#tgo');
  await st[1].waitForSelector('.toast:has-text("Bought")',{timeout:8000}); console.log('real buy ack in',Date.now()-tt,'ms:',await st[1].locator('.toast').innerText());
  await st[2].waitForTimeout(1500); console.log('VOLT price on other device',pBefore,'->',await st[2].locator('tr.mk[data-i="8"] td.pxc').innerText());
  // candles
  await st[1].waitForTimeout(7000);
  console.log('candles drawn (live):',await st[1].locator('svg.ch rect').count());
  await st[1].click('button[data-act="tf"][data-m="year"]'); await st[1].waitForTimeout(400); console.log('candles drawn (year):',await st[1].locator('svg.ch rect').count());
  await st[1].click('button[data-act="tf"][data-m="live"]');
  await st[1].screenshot({path:OUT+'v2_detail.png'});
  // news ticker
  await st[2].waitForTimeout(4000); console.log('ticker:',(await st[2].locator('#ticker').innerText()).replace(/\n/g,' | '));
  await st[0].screenshot({path:OUT+'v2_phone.png'});
  // analyst report
  await st[3].click('tr.mk[data-i="9"]'); await st[3].waitForSelector('button[data-act="dd"]'); await st[3].click('button[data-act="dd"]'); await st[3].waitForSelector('text=Your analyst report',{timeout:6000}); console.log('analyst report ok');
  // sell
  await st[1].click('tr.mk[data-i="8"]'); await st[1].click('button[data-act="side"][data-s="sell"]'); await st[1].click('button[data-act="frac"][data-f="0.5"]'); await st[1].click('#tgo'); await st[1].waitForSelector('.toast:has-text("Sold")',{timeout:6000}); console.log('sell ok');
  // host views
  await host.click('[data-t="proj"]'); await host.waitForTimeout(800); await host.screenshot({path:OUT+'v2_host_proj.png'});
  await host.click('[data-t="board"]'); await host.waitForTimeout(500); await host.screenshot({path:OUT+'v2_host_board.png'});
  // year tick sync
  const yr=async p=>+((await p.locator('#ck').innerText()).match(/Year (\d+)/)||[0,0])[1]; const y0=await yr(st[2]);
  await host.click('#bN'); await host.waitForTimeout(500); await st[2].waitForFunction(y=>{const m=document.querySelector('#ck').textContent.match(/Year (\d+)/);return m&&+m[1]>y;},y0,{timeout:6000}); console.log('year sync ok:',y0,'->',await st[2].locator('#ck').innerText());
  await st[1].click('[data-act="tab"][data-t="port"]'); await st[1].waitForTimeout(500); await st[1].screenshot({path:OUT+'v2_port.png'});
  // end
  await host.click('[data-t="ctl"]'); await host.waitForTimeout(300); await host.click('#cE'); await host.waitForTimeout(2500);
  await st[1].waitForFunction(()=>/Game over/.test(document.querySelector('#ck').textContent),null,{timeout:8000});
  await st[1].waitForSelector('tr.rr',{timeout:5000}); console.log('results rows (student):',await st[1].locator('tr.rr').count());
  await st[1].click('tr.rr.me'); await st[1].waitForTimeout(300); console.log('my portfolio expanded:',(await st[1].locator('tr.rd').innerText()).replace(/\n/g,' ').slice(0,200));
  await st[1].screenshot({path:OUT+'v2_results.png',fullPage:true});
  await host.waitForSelector('tr.rr',{timeout:8000}); console.log('host results rows:',await host.locator('tr.rr').count());
  await host.click('tr.rr >> nth=0'); await host.waitForTimeout(300); await host.screenshot({path:OUT+'v2_host_results.png',fullPage:true});
  console.log('ERRORS:',errs.length?errs.join('\n'):'none');
  await br.close();
})().catch(e=>{console.error('FAIL',e.message);console.error(globalThis.__errs||'');process.exit(1)});

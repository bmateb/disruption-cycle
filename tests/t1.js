const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
const OUT='/tmp/claude-0/-home-claude/747d27db-7c5d-579f-857d-32c42d7dd09c/scratchpad/captest/';
(async()=>{
  const br=await chromium.launch(); const errs=[];
  const mk=async(w,h,name)=>{const ctx=await br.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(name+' CONSOLE '+m.text())});p.on('dialog',d=>d.accept());return p;};
  const host=await mk(1400,900,'host');
  await host.goto(BASE+'#host=1'); await host.waitForSelector('#go');
  await host.selectOption('#sR','custom'); await host.fill('#sU',BU); await host.fill('#sT','8'); await host.fill('#sS','20'); await host.fill('#sB','4'); await host.fill('#sA',BASE);
  await host.click('#go'); await host.waitForSelector('#lstart',{timeout:20000});
  const link=await host.locator('.mono.small').first().innerText(); console.log('join link',link);
  const students=[];
  for(let i=0;i<6;i++){ const p=await mk(i===0?390:1200,i===0?800:850,'s'+i); await p.goto(link); await p.waitForSelector('#nm'); await p.fill('#nm','Student'+i); await p.click('#nb'); students.push(p); }
  await students[0].waitForSelector('text=You are in',{timeout:15000});
  await host.waitForFunction(()=>document.querySelector('#lcnt').textContent.startsWith('6'),null,{timeout:15000});
  console.log('lobby count',await host.locator('#lcnt').innerText());
  await host.screenshot({path:OUT+'lobby.png'});
  await host.click('#lstart'); 
  for(const p of students) await p.waitForSelector('tr.mk',{timeout:15000});
  console.log('market visible on all');
  // trade: s1 buys VOLT? pick row index 8
  const priceOf=async(p,i)=>parseFloat(await p.locator('tr.mk[data-i="'+i+'"] td:nth-child(2)').innerText());
  const p0=await priceOf(students[2],8); 
  await students[1].click('tr.mk[data-i="8"]'); await students[1].waitForSelector('#tgo'); await students[1].click('button[data-a="25000"]');
  const t0=Date.now(); await students[1].click('#tgo');
  await students[2].waitForFunction(([i,p0])=>{const v=parseFloat(document.querySelector('tr.mk[data-i="'+i+'"] td:nth-child(2)').innerText);return v>p0+0.001;},[8,p0],{timeout:8000});
  console.log('price moved on other device in',Date.now()-t0,'ms; from',p0,'to',await priceOf(students[2],8));
  await students[1].waitForSelector('.toast');console.log('toast:',await students[1].locator('.toast').innerText());
  // dd purchase on s3
  await students[3].click('tr.mk[data-i="9"]'); await students[3].waitForSelector('button[data-act="dd"]'); await students[3].click('button[data-act="dd"]'); await students[3].waitForSelector('text=Your due-diligence report',{timeout:6000}); console.log('dd ok');
  // sell
  await students[1].click('button[data-act="side"][data-s="sell"]'); await students[1].click('button[data-act="frac"][data-f="0.5"]'); await students[1].click('#tgo'); await students[1].waitForSelector('.toast:has-text("Sold")',{timeout:6000}); console.log('sell ok');
  await students[1].screenshot({path:OUT+'s1_desktop.png'});
  await students[0].click('tr.mk[data-i="2"]'); await students[0].waitForTimeout(600); await students[0].screenshot({path:OUT+'s0_phone_detail.png'});
  await students[0].click('button[data-act="back"]'); await students[0].screenshot({path:OUT+'s0_phone_market.png'});
  await host.click('[data-t="class"]'); await host.waitForTimeout(800); await host.screenshot({path:OUT+'host_class.png'});
  await host.click('[data-t="board"]'); await host.waitForTimeout(500); await host.screenshot({path:OUT+'host_board.png'});
  // advance ticks
  for(let k=0;k<3;k++){ await host.click('#bN'); await host.waitForTimeout(400); }
  await students[2].waitForFunction(()=>document.querySelector('#ck').textContent.includes('Year 3'),null,{timeout:6000}); console.log('tick sync ok:',await students[2].locator('#ck').innerText());
  await students[2].click('[data-act="tab"][data-t="news"]'); await students[2].waitForTimeout(600); await students[2].screenshot({path:OUT+'s2_news.png'});
  await students[1].click('[data-act="tab"][data-t="port"]'); await students[1].waitForTimeout(600); await students[1].screenshot({path:OUT+'s1_port.png'});
  // end game
  await host.click('[data-t="ctl"]'); await host.waitForTimeout(400); await host.click('#cE'); await host.waitForTimeout(1500);
  await students[1].waitForFunction(()=>document.querySelector('#ck').textContent.includes('Final'),null,{timeout:8000});
  await students[1].click('[data-act="tab"][data-t="board"]'); await students[1].waitForTimeout(800); await students[1].screenshot({path:OUT+'s1_end.png',fullPage:true});
  await host.click('[data-t="debrief"]'); await host.waitForTimeout(800); await host.screenshot({path:OUT+'host_debrief.png',fullPage:true});
  console.log('ERRORS:',errs.length?errs.join('\n'):'none');
  await br.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});

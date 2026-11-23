const { chromium } = require('playwright'); const {spawn}=require('child_process');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
(async()=>{
  const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const host=await ctx.newPage(); host.on('dialog',d=>d.accept());
  const errs=[]; host.on('pageerror',e=>errs.push(e.message));
  await host.goto(BASE+'#host=1'); await host.waitForSelector('#go');
  await host.selectOption('#sR','custom'); await host.fill('#sU',BU); await host.fill('#sT','10'); await host.fill('#sS','30'); await host.fill('#sB','6'); await host.fill('#sA',BASE);
  await host.click('#go'); await host.waitForSelector('#lstart',{timeout:20000});
  const room=(await host.locator('.mono.small').first().innerText()).match(/r=(\w+)/)[1];
  const ld=spawn('node',['load.js',room,'45','60'],{cwd:'/tmp/claude-0/-home-claude/747d27db-7c5d-579f-857d-32c42d7dd09c/scratchpad/captest'}); let out=''; ld.stdout.on('data',d=>out+=d); ld.stderr.on('data',d=>out+=d);
  await host.waitForFunction(()=>document.querySelector('#lcnt').textContent.startsWith('45'),null,{timeout:20000}); console.log('45 joined');
  await host.click('#lstart'); await host.waitForTimeout(1000);
  // measure main-thread blocking on host
  const t0=Date.now(); const res=await host.evaluate(()=>new Promise(r=>{let worst=0,last=performance.now(),n=0;const iv=setInterval(()=>{const now=performance.now();worst=Math.max(worst,now-last-100);last=now;if(++n>=300){clearInterval(iv);r(worst)}},100);}));
  console.log('host worst event-loop lag ms',Math.round(res));
  await host.click('[data-t="class"]'); await host.waitForTimeout(500); await host.screenshot({path:'host45.png'});
  await new Promise(r=>ld.on('close',r)); console.log(out.trim()); console.log('errors',errs.length?errs:'none'); await br.close(); process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});

const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
const OUT='/tmp/claude-0/-home-claude/747d27db-7c5d-579f-857d-32c42d7dd09c/scratchpad/captest/';
const {execSync,spawn}=require('child_process');
(async()=>{
  const br=await chromium.launch(); const errs=[];
  const mk=async(w,h,name)=>{const ctx=await br.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+' PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/WebSocket|ERR_/.test(m.text()))errs.push(name+' CONSOLE '+m.text())});p.on('dialog',d=>d.accept());return p;};
  const host=await mk(1400,900,'host');
  await host.goto(BASE+'#host=1'); await host.waitForSelector('#go');
  await host.selectOption('#sR','custom'); await host.fill('#sU',BU); await host.fill('#sT','10'); await host.fill('#sS','60'); await host.fill('#sB','0'); await host.fill('#sA',BASE);
  await host.click('#go'); await host.waitForSelector('#lstart',{timeout:20000});
  const link=await host.locator('.mono.small').first().innerText(); const room=link.match(/r=(\w+)/)[1]; console.log('room',room);
  const a=await mk(1200,850,'a'); await a.goto(link); await a.fill('#nm','Anna'); await a.click('#nb');
  const b=await mk(390,800,'b'); await b.goto(link); await b.fill('#nm','Bela'); await b.click('#nb');
  await a.waitForSelector('text=You are in'); await host.click('#lstart'); await a.waitForSelector('tr.mk'); await b.waitForSelector('tr.mk');
  // Anna buys
  await a.click('tr.mk[data-i="4"]'); await a.waitForSelector('#tgo'); await a.click('button[data-a="10000"]'); await a.click('#tgo'); await a.waitForSelector('.toast');
  const cash1=await a.locator('#kCash').innerText(); console.log('Anna cash after buy',cash1);
  // reload Anna; state persists
  await a.reload(); await a.waitForSelector('tr.mk',{timeout:15000}); await a.waitForTimeout(800); console.log('Anna cash after reload',await a.locator('#kCash').innerText());
  await a.click('[data-act="tab"][data-t="port"]'); await a.waitForTimeout(500); console.log('portfolio rows',await a.locator('tr.mk').count());
  // trade after reload works (sq persistence)
  await a.click('[data-act="tab"][data-t="market"]'); await a.click('tr.mk[data-i="5"]'); await a.waitForSelector('#tgo'); await a.click('button[data-a="5000"]'); await a.click('#tgo'); await a.waitForSelector('.toast:has-text("Bought")',{timeout:6000}); console.log('post-reload trade ok');
  // reload host mid-game
  await host.reload(); await host.waitForSelector('#hbody',{timeout:15000}); await host.waitForTimeout(1500); console.log('host resumed:',await host.locator('#hclk').innerText());
  await b.click('tr.mk[data-i="4"]'); await b.waitForSelector('#tgo'); await b.click('button[data-a="5000"]'); await b.click('#tgo'); await b.waitForSelector('.toast:has-text("Bought")',{timeout:8000}); console.log('trade after host reload ok');
  // broker restart
  execSync('kill $(cat /tmp/srv.pid)'); await new Promise(r=>setTimeout(r,2500)); spawn('node',['srv.js'],{cwd:'/tmp/claude-0/-home-claude/747d27db-7c5d-579f-857d-32c42d7dd09c/scratchpad/cap',detached:true,stdio:'ignore'}).unref(); await new Promise(r=>setTimeout(r,4000));
  await a.click('[data-act="tab"][data-t="market"]'); await a.click('tr.mk[data-i="6"]'); await a.waitForSelector('#tgo'); await a.click('button[data-a="2000"]'); await a.click('#tgo');
  try{ await a.waitForSelector('.toast:has-text("Bought")',{timeout:12000}); console.log('trade after broker restart ok'); }catch(e){ console.log('NO ACK after broker restart'); }
  // late joiner
  const c=await mk(1200,800,'c'); await c.goto(link); await c.fill('#nm','Cili'); await c.click('#nb'); await c.waitForSelector('tr.mk',{timeout:12000}); console.log('late joiner sees market; rank',await c.locator('#kRank').innerText());
  await c.screenshot({path:OUT+'late.png'});
  await b.screenshot({path:OUT+'b_phone.png'});
  console.log('ERRORS:',errs.length?errs.join('\n'):'none'); await br.close(); process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});

const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
(async()=>{const br=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const errs=[];const mk=async(w,h)=>{const c=await br.newContext({viewport:{width:w,height:h}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));return p;};
const host=await mk(1400,900);await host.goto(BASE+'#host=1');await host.waitForSelector('#go');
await host.selectOption('#sR','custom');await host.fill('#sU',BU);await host.fill('#sT','10');await host.fill('#sS','60');await host.fill('#sB','4');await host.fill('#sA',BASE);
await host.check('#sBk').catch(()=>{});await host.fill('#sBs','8').catch(()=>{});
await host.click('#go');await host.waitForSelector('#lstart');const link=await host.locator('.mono.small').first().innerText();
const ph=await mk(390,844);await ph.goto(link);await ph.fill('#nm','P');await ph.click('#nb');await ph.waitForSelector('.prac');await ph.click('button[data-act="rdy"]');
await host.click('#lstart');await ph.waitForFunction(()=>/Year 1/.test(document.querySelector('#ck').textContent));
await ph.click('#cnav >> text=Market');await ph.click('tr.mk[data-i="12"]');await ph.click('button[data-act="amt"][data-a="5000"]');await ph.waitForTimeout(300);await ph.click('#tgo');await ph.waitForFunction(()=>C.priv.hold[12]>0);
for(let k=0;k<4;k++){await host.click('#bN').catch(()=>{});await host.waitForTimeout(12000);}
console.log('host sounds:',await host.evaluate(()=>SFX.log.join(',')));
console.log('phone sounds:',await ph.evaluate(()=>SFX.log.join(',')));
await ph.click('.sndb');console.log('muted attr',await ph.evaluate(()=>document.documentElement.dataset.sound),'on()',await ph.evaluate(()=>SFX.on()));
const n=await ph.evaluate(()=>SFX.log.length);await ph.evaluate(()=>SFX.play('buy'));console.log('muted play adds nothing:',n===await ph.evaluate(()=>SFX.log.length));
console.log('ERR',errs);await br.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

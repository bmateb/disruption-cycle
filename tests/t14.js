const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt';
(async()=>{const br=await chromium.launch();const errs=[];const c=await br.newContext({viewport:{width:1400,height:900}});const host=await c.newPage();host.on('pageerror',e=>errs.push(e.message));
await host.goto(BASE+'#host=1');await host.waitForSelector('#go');
await host.selectOption('#sR','custom');await host.fill('#sU',BU);await host.fill('#sT','6');await host.fill('#sS','60');await host.fill('#sB','4');await host.fill('#sA',BASE);await host.uncheck('#sBk');
await host.click('#go');await host.waitForSelector('#lstart');await host.click('#lstart');await host.waitForTimeout(1500);
await host.click('#hbody tr.mk[data-i="13"]');await host.waitForTimeout(500);console.log('from board ->',await host.locator('#hdt h2').first().innerText());await host.waitForSelector('#hmt tr.mk[data-i="14"]');
for(const i of [12,13,14,3]){await host.click('#hmt tr.mk[data-i="'+i+'"]');await host.waitForTimeout(400);console.log(i,(await host.locator('#hdt h2').first().innerText()).slice(0,40));}
await host.click('#hmt tr.mk[data-i="14"]');await host.waitForTimeout(400);await host.screenshot({path:'v71_host.png'});
console.log('ERR',errs);await br.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt', OUT=__dirname+'/';
(async()=>{const br=await chromium.launch();const errs=[];const mk=async(w,h)=>{const c=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());return p;};
const host=await mk(1400,900);await host.goto(BASE+'#host=1');await host.waitForSelector('#go');
await host.selectOption('#sR','custom');await host.fill('#sU',BU);await host.fill('#sT','6');await host.fill('#sS','40');await host.fill('#sB','4');await host.fill('#sA',BASE);await host.uncheck('#sBk');await host.uncheck('#sEv').catch(()=>{});
await host.click('#go');await host.waitForSelector('#lstart');const link=await host.locator('.mono.small').first().innerText();
const ph=await mk(390,844);await ph.goto(link);await ph.fill('#nm','P');await ph.click('#nb');await ph.waitForSelector('.prac');
// practice trade in bond
await ph.click('#cnav >> text=Market');await ph.click('tr.mk[data-i="12"]');await ph.waitForSelector('#tgo');await ph.click('button[data-act="amt"][data-a="10000"]');await ph.waitForTimeout(300);console.log('practice btn:',await ph.locator('#tgo').innerText());await ph.click('#tgo');await ph.waitForTimeout(500);
console.log('practice hold:',await ph.evaluate(()=>C.priv.hold[12]));
await ph.click('button[data-act="rdy"]');await host.click('#lstart');await ph.waitForFunction(()=>/Year 1/.test(document.querySelector('#ck').textContent));
// real trades
for(const [i,a] of [[12,10000],[13,10000],[14,20000]]){await ph.evaluate(()=>{C.sel=null;C.tab='market';C.dirty=true;$('#cbody').dataset.k='';});await ph.click('tr.mk[data-i="'+i+'"]');await ph.waitForSelector('#tgo');await ph.click('button[data-act="amt"][data-a="'+(a>10000?25000:10000)+'"]');await ph.waitForTimeout(300);await ph.click('#tgo');await ph.waitForFunction(j=>C.priv.hold[j]>0,i,{timeout:8000});}
console.log('holds:',await ph.evaluate(()=>C.priv.hold.slice(12).join()),'cash',await ph.evaluate(()=>Math.round(C.priv.cash)));
await ph.screenshot({path:OUT+'v7_detail.png'});
await ph.evaluate(()=>{C.sel=null;C.dirty=true;$('#cbody').dataset.k='';});await ph.waitForTimeout(500);await ph.screenshot({path:OUT+'v7_market.png',fullPage:false});
await ph.evaluate(()=>window.scrollTo(0,500));await ph.screenshot({path:OUT+'v7_market2.png'});
await ph.click('#cnav >> text=Portfolio');await ph.waitForTimeout(500);await ph.screenshot({path:OUT+'v7_port.png',fullPage:true});
await host.screenshot({path:OUT+'v7_host.png'});
// run years to see coupon
for(let k=0;k<6;k++){await host.click('#bN').catch(()=>{});await ph.waitForTimeout(700);}
await ph.waitForFunction(()=>C.tk&&C.tk.fin,null,{timeout:30000}).catch(()=>{});
console.log('coupons:',await ph.evaluate(()=>C.priv.cp),'fin rows:',await ph.evaluate(()=>C.tk.fin?C.tk.fin.length:'none'));
await ph.click('#cnav >> text=Results').catch(()=>{});await ph.waitForTimeout(600);await ph.screenshot({path:OUT+'v7_results.png',fullPage:true});
console.log('ERRORS',errs.length?errs:'none');await br.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

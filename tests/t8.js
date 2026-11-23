const { chromium } = require('playwright');
const BASE='http://localhost:8099/', BU='ws://localhost:8083/mqtt', OUT=__dirname+'/';
(async()=>{
  const br=await chromium.launch(); const errs=[];
  const mk=async(w,h)=>{const c=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());return p;};
  const host=await mk(1400,900); await host.goto(BASE+'#host=1'); await host.waitForSelector('#go');
  await host.selectOption('#sR','custom'); await host.fill('#sU',BU); await host.fill('#sT','10'); await host.fill('#sS','60'); await host.fill('#sB','4'); await host.fill('#sA',BASE); await host.uncheck('#sBk'); await host.fill('#sEs','9');
  await host.click('#go'); await host.waitForSelector('#lstart'); const link=await host.locator('.mono.small').first().innerText();
  const ph=await mk(390,800); await ph.goto(link); await ph.fill('#nm','Phone'); await ph.click('#nb'); await ph.waitForSelector('.prac'); await ph.click('button[data-act="rdy"]');
  await host.click('#lstart'); await ph.waitForFunction(()=>/Year 1/.test(document.querySelector('#ck').textContent));
  let found=false;
  for(let k=0;k<12&&!found;k++){ await host.click('#bN').catch(()=>{}); await ph.waitForTimeout(1300); found=await ph.locator('.ann .ai').count()>0; if(!found) await ph.waitForTimeout(500); }
  if(!found){console.log('no major news within 12 years?');process.exit(1);}
  console.log('dropdown items:',(await ph.locator('.ann .ai').allInnerTexts()).join(' || '));
  console.log('header:',(await ph.locator('.annh').innerText()).replace(/\n/g,' '),'| clock:',await ph.locator('#ck').innerText());
  await ph.screenshot({path:OUT+'v5_phone_ann.png'});
  const a=await ph.evaluate(()=>C.pub.P.join()); await ph.waitForTimeout(2200); const b=await ph.evaluate(()=>C.pub.P.join()); console.log('prices frozen:',a===b);
  await ph.click('.annh'); await ph.waitForTimeout(300); console.log('collapsed items:',await ph.locator('.ann .ai').count());
  console.log('host banner:',(await host.locator('#hann .annh').innerText()).replace(/\n/g,' '));
  await host.screenshot({path:OUT+'v5_host_ann.png'});
  await ph.waitForFunction(()=>!document.querySelector('.ann')&&/Year \d+ \//.test(document.querySelector('#ck').textContent),null,{timeout:20000}); console.log('resumed:',await ph.locator('#ck').innerText());
  console.log('ERRORS',errs.length?errs:'none'); await br.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

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
  // host QR modal
  await host.click('#bQ'); await host.waitForSelector('#qrm .qr.big svg');
  console.log('QR modal ok, code:',(await host.locator('#qrm .code').innerText()),'link shown:',(await host.locator('#qrm .mono').innerText())===link);
  await host.screenshot({path:OUT+'v6_host_qr.png'}); await host.click('#qrx'); console.log('modal closed:',await host.locator('#qrm').count()===0);
  await host.click('#cQ').catch(async()=>{await host.click('text=Controls').catch(()=>{});await host.click('#cQ');}); console.log('controls QR btn ok:',await host.locator('#qrm').count()===1); await host.click('#qrx');
  // 1) kill connection: simulate dead link
  const t0=await ph.evaluate(()=>C.lastPubAt);
  await ph.evaluate(()=>{C.net.close(); C.st='down'; C.lastPubAt=Date.now()-20000;}); // stale
  await ph.waitForTimeout(500);
  console.log('banner shown:',await ph.locator('.conn-warn').count()>0);
  await ph.screenshot({path:OUT+'v6_phone_warn.png'});
  await ph.click('.conn-warn button'); await ph.waitForFunction(()=>C.st==='up'&&Date.now()-C.lastPubAt<3000,null,{timeout:15000});
  await ph.waitForTimeout(800); console.log('manual reconnect ok; banner gone:',await ph.locator('.conn-warn').count()===0);
  // 2) auto reconnect via watchdog (no click)
  await ph.evaluate(()=>{C.net.close(); C.st='down'; C.lastConnAt=Date.now()-11000;});
  await ph.waitForFunction(()=>C.st==='up',null,{timeout:15000}); console.log('watchdog auto reconnect ok');
  // 3) visibility wake
  await ph.evaluate(()=>{C.net.close(); C.st='down'; document.dispatchEvent(new Event('visibilitychange'));});
  await ph.waitForFunction(()=>C.st==='up',null,{timeout:10000}); console.log('wake reconnect ok');
  // 4) dot click
  await ph.evaluate(()=>{C.net.close(); C.st='down';}); await ph.click('#cconn'); await ph.waitForFunction(()=>C.st==='up',null,{timeout:10000}); console.log('dot reconnect ok');
  // 5) reload restores state
  await ph.reload(); await ph.waitForFunction(()=>document.querySelector('#ck')&&/Year/.test(document.querySelector('#ck').textContent),null,{timeout:15000}); console.log('reload restored:',await ph.locator('#ck').innerText(), 'still Phone:',/Phone/.test(await ph.content()));
  // 6) landing rejoin card
  const url=ph.url().split('#')[0]; await ph.goto(url); await ph.waitForTimeout(500);
  console.log('rejoin card:',await ph.locator('#rj').count()===1);
  await ph.screenshot({path:OUT+'v6_landing.png'});
  await ph.click('#rj'); await ph.waitForFunction(()=>document.querySelector('#ck')&&/Year/.test(document.querySelector('#ck').textContent),null,{timeout:15000}); console.log('rejoin ok:',await ph.locator('#ck').innerText());
  console.log('ERRORS',errs.length?errs:'none'); await br.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

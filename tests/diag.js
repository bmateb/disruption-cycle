const DC=require('../src/engine.js'); const {run}=require('./sim.js');
const mix=['index','index','momentum','momentum','informed','informed','contrarian','gambler'];
let ps={1:[],2:[],3:[]}, pg={1:[],2:[],3:[]}, rais=[], peak=[], endret=[];
for(let s=0;s<60;s++){const G=run('d'+s,40,mix);
 G.pr.forEach(p=>{p.gl.forEach(g=>{ps[p.h].push(g.ps);pg[p.h].push(g.pg)}); rais.push([p.h,p.cls/G.K,p.raised/ (p.burn*G.T)]); peak.push([p.h,Math.max(...p.ph)/p.ph[0],p.ph[p.ph.length-1]/p.ph[0]]);});
 const lb=DC.leaderboard(G); endret.push(lb[0].r, lb[lb.length-1].r, lb[Math.floor(lb.length/2)].r);}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const h of [1,2,3]) console.log('H'+h,'avg psi at gate',avg(ps[h]).toFixed(2),'avg p pass',avg(pg[h]).toFixed(2));
for(const h of [1,2,3]){const r=rais.filter(x=>x[0]===h);console.log('H'+h,'class inflow / K',avg(r.map(x=>x[1])).toFixed(3),'raised/total burn',avg(r.map(x=>x[2])).toFixed(2));}
for(const h of [1,2,3]){const r=peak.filter(x=>x[0]===h);console.log('H'+h,'peak/start',avg(r.map(x=>x[1])).toFixed(2),'end/start',avg(r.map(x=>x[2])).toFixed(2));}
const best=endret.filter((_,i)=>i%3===0),worst=endret.filter((_,i)=>i%3===1),med=endret.filter((_,i)=>i%3===2);
console.log('winner ret',avg(best).toFixed(2),'loser ret',avg(worst).toFixed(2),'median',avg(med).toFixed(2));

const DC=require('../src/engine.js'); const {run}=require('./sim.js');
const mix=['index','index','momentum','momentum','informed','informed','contrarian','gambler'];
const first={1:[],2:[],3:[]}; const mid={1:[],2:[],3:[]};
for(let s=0;s<40;s++){const G=run('f'+s,30,mix);G.pr.forEach(p=>{first[p.h].push(Math.abs(p.ph[1]/p.ph[0]-1));mid[p.h].push(Math.max(...p.ph)/p.ph[0]);});}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const h of [1,2,3])console.log('H'+h,'mean |move| at year 1',avg(first[h]).toFixed(2),'mean peak/start',avg(mid[h]).toFixed(2));

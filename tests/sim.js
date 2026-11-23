const DC=require('../src/engine.js');
function run(seed,n,mix,opts){
  opts=opts||{};
  const G=DC.newGame(Object.assign({T:14},opts.cfg||{}),seed);
  const rng=DC.rndS(DC.hash('b'+seed));
  const styles=[];
  for(let i=0;i<n;i++){const s=mix[i%mix.length];styles.push(s);DC.addPlayer(G,'p'+i,'P'+i,s);}
  DC.start(G);
  for(let t=0;t<G.T;t++){
    for(let rep=0;rep<8;rep++){
      for(const id of G.ord){const pl=G.pl[id]; if(rng()<0.5) DC.botAct(G,pl,rng);}
    }
    DC.advance(G);
  }
  return G;
}
function stats(a){const m=a.reduce((x,y)=>x+y,0)/a.length;const sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);return [m,sd];}
module.exports={run,stats};
if(require.main===module){
  const n=+process.argv[2]||40, S=+process.argv[3]||60;
  const mix=['index','index','momentum','momentum','informed','informed','contrarian','gambler'];
  const agg={}; let zmaxs=[],dead=[0,0,0,0],ret=[];
  const byH={1:[],2:[],3:[]};
  for(let s=0;s<S;s++){
    const G=run('s'+s,n,mix);
    for(const id of G.ord){const pl=G.pl[id];const r=DC.netWorth(G,pl)/G.cfg.cash0-1;(agg[pl.bot]=agg[pl.bot]||[]).push(r);}
    G.pr.forEach(p=>{zmaxs.push(p.zmax);byH[p.h].push([p.st,p.P/p.ph[0]]);});
  }
  Object.keys(agg).forEach(k=>{const [m,sd]=stats(agg[k]);console.log(k.padEnd(11),'mean',(m*100).toFixed(1).padStart(6)+'%','sd',(sd*100).toFixed(1).padStart(5)+'%');});
  console.log('zmax mean',stats(zmaxs)[0].toFixed(2),'max',Math.max(...zmaxs).toFixed(2));
  for(const h of [1,2,3]){const a=byH[h];const ex=a.filter(x=>x[0]==='exit'||x[0]==='sold').length/a.length;console.log('H'+h,'survive',(ex*100).toFixed(0)+'%','mean final/start',stats(a.map(x=>x[1]))[0].toFixed(2));}
}

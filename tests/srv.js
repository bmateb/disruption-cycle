const http=require('http'),fs=require('fs');const aedes=require('aedes')();const ws=require('websocket-stream');
const mq=http.createServer();ws.createServer({server:mq},aedes.handle);mq.listen(8083,()=>console.log('mqtt ws 8083'));
let n=0;aedes.on('publish',(p)=>{if(!p.topic.startsWith('$'))n++;});setInterval(()=>{if(n){console.log('msgs/5s',n);n=0}},5000);
http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(fs.readFileSync(__dirname+'/../index.html'));}).listen(8099,()=>console.log('http 8099'));

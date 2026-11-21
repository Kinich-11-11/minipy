'use strict';
const fs=require('fs');
const lines = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp23.txt','utf8').split(/\r?\n/);
const names = ['lpi','lplo','lphi','lacc','ed','ek','eop','cfor','cdep','ck','ln','lstart','lcount','lfacc','lfn','lfi','LComm','LOut','ev','evtype','error','LSave','FrVBase','FrLBase','VSave','Tok','lsep','lesc1','epI','epN','epB'];
const res = {};
for (const n of names) res[n]=[];
lines.forEach((t,i)=>{ for(const n of names){ if(new RegExp('(^|[^A-Za-z0-9_])'+n+'([^A-Za-z0-9_]|$)').test(t)) res[n].push(i+1);} });
const fpushStart = lines.findIndex(l=>/^PROC fpush\b/.test(l))+1;
const fpopStart = lines.findIndex(l=>/^PROC fpop\b/.test(l))+1;
const listlitStart = lines.findIndex(l=>/^PROC listlit\b/.test(l))+1;
const tupleStart = lines.findIndex(l=>/^PROC tuplelit\b/.test(l))+1;
console.log('fpush@'+fpushStart+' fpop@'+fpopStart+' listlit@'+listlitStart+' tuplelit@'+tupleStart);
for(const n of names){
  const inFpush = res[n].filter(x=>x>=fpushStart&&x<fpopStart);
  const inFpop  = res[n].filter(x=>x>=fpopStart);
  console.log(n.padEnd(9)+' total='+String(res[n].length).padStart(3)+
    '  fpush:'+(inFpush.length? inFpush.slice(0,3).join('/')+(inFpush.length>3?'+'+inFpush.length:''):'-')+
    '  fpop:'+(inFpop.length? inFpop.slice(0,3).join('/')+(inFpop.length>3?'+'+inFpop.length:''):'-')+
    '  all='+(res[n].length>14? res[n].slice(0,4).join(',')+'..'+res[n].slice(-4).join(','):res[n].join(',')));
}


const fs=require('fs');
function load(p){ const t=fs.readFileSync(p,'utf8'); const i=t.indexOf('[{'); return JSON.parse(t.slice(i)); }
const v5=load('D:/编程/scratch/ai/minipython/_work/v5test/p2_v5.txt');
const py=load('D:/编程/scratch/ai/minipython/_work/v5test/p2_py.txt');
const m={}; for(const r of py) m[r.name]=r.out;
let same=0, diff=0;
for(const r of v5){
  const want=m[r.name];
  const ok=JSON.stringify(r.out)===JSON.stringify(want);
  if(ok) same++; else diff++;
  console.log((ok?'OK   ':'DIFF ')+r.name.padEnd(20)+' mini='+JSON.stringify(r.out)+(r.err?(' ERR='+r.err):'')+'  py='+JSON.stringify(want));
}
console.log('same='+same+' diff='+diff);

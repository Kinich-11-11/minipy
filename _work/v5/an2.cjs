const fs=require('fs');
const src=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js','utf8');
const lines=src.split('\n');
lines.forEach((l,i)=>{ if(/^\s{0,2}(function |const key|const CHARLIST|const BUILTINS|module\.exports)/.test(l)) console.log((i+1)+': '+l.slice(0,70)); });
let depth=0;
for(let i=0;i<lines.length;i++){ const s=lines[i]; let d=0,inStr=null;
  for(let k=0;k<s.length;k++){ const c=s[k];
    if(inStr){ if(c==='\\'){k++;continue;} if(c===inStr) inStr=null; continue; }
    if(c==="'"||c==='"'||c==='\`'){inStr=c;continue;}
    if('([{'.includes(c)) d++; else if(')]}'.includes(c)) d--; }
  depth+=d; }
console.log('FINAL DEPTH',depth,'lines',lines.length);

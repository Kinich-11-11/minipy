'use strict';
const fs=require('fs');
const L=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp24.txt','utf8').split(/\r?\n/);
let proc='';
const rows=[];
L.forEach((t,i)=>{
  const m=t.match(/^(PROC|WHEN)\s+(.*)$/); if(m){ proc=m[1]+' '+m[2].split('  ')[0]; }
  const isOpen=/=="\["\)/.test(t) && /=="\("\)/.test(t);
  const isClose=/=="\]"\)/.test(t) && /=="\)"\)/.test(t);
  if(isOpen||isClose) rows.push({ln:i+1, proc, kind:isOpen?'open':'close', txt:t.trim()});
});
console.log('total depth-scan lines: '+rows.length);
const byProc={};
for(const r of rows){ (byProc[r.proc]=byProc[r.proc]||[]).push(r.ln+(r.kind==='open'?'o':'c')); }
for(const k of Object.keys(byProc)) console.log(k+'  ['+byProc[k].length+']  '+byProc[k].join(','));
console.log('--- lines that already mention { ---');
for(const r of rows) if(/\{/.test(r.txt)) console.log(r.ln+' '+r.proc+' '+r.txt);
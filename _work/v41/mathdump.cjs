
const fs=require('fs');
const lines=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp41.txt','utf8').split('\n');
let start=lines.findIndex(l=>/^PROC methodcall/.test(l));
let end=lines.findIndex((l,i)=>i>start && /^PROC /.test(l));
const seg=lines.slice(start,end);
for(let i=0;i<seg.length;i++){
  const m=/of "Tok"==(.+)\)/.exec(seg[i]);
  if(m){ const body=[]; for(let j=i+1;j<Math.min(i+8,seg.length);j++){ const t=seg[j]; if(/^\s*(if |PROC)/.test(t)) break; if(/ev = |evtype = /.test(t)) body.push(t.trim()); }
    console.log(m[1].padEnd(12), '::', body.join(' | ').slice(0,90)); }
}

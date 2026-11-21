'use strict';
const fs=require('fs');
const D='D:/编程/scratch/ai/minipython/_work/v41/';
const lines = fs.readFileSync(D+'decomp23.txt','utf8').split('\n');
// find section starts: PROC / WHEN at column 0
const starts = [];
lines.forEach((l,i)=>{ if(/^(PROC|WHEN)\b/.test(l)) starts.push(i); });
starts.push(lines.length);
const sections = starts.slice(0,-1).map((s,i)=>({name: lines[s], text: lines.slice(s, starts[i+1]).join('\n')}));
const want = process.argv.slice(2);
for (const w of want) {
  const hits = sections.filter(s=>s.name.includes(w));
  for (const h of hits) {
    console.log('#### ' + h.name + '   (decomp23 lines ' + (lines.indexOf(h.text.split('\n')[0])+1) + ', ' + h.text.split('\n').length + ' lines)');
  }
  if (!hits.length) console.log('#### NOT FOUND: ' + w);
}
// write bundle of everything containing LComm/LOut plus the named procs
const bundle = [];
const named = sections.filter(s=>/PROC (listlit|eval|tokenize|listlen|listitem|listfmt|lsort|fpush|fpop|atom|indexget|methodcall|assign|prepare|calluser|rightside|pair)\b/.test(s.name));
for (const s of named) bundle.push(s.text);
fs.writeFileSync(D+'A13_code.txt', bundle.join('\n\n'));
console.log('bundle lines', bundle.join('\n').split('\n').length);

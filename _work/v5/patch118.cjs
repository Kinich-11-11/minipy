const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const del=["      ...L.outLine(E.join(E.str('|JT=['), E.join(E.var('jt'), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('|I='), E.join(E.var('jsi'), E.join(E.str(' root=['), E.join(E.var('jsroot'), E.join(E.str('] D='), E.var('jsd'))))))),",
  "          ...L.outLine(E.join(E.str('|PARSE c=['), E.join(E.var('jsc'), E.str(']')))),",
  "            ...L.outLine(E.str('|LBR')),",
  "            ...L.outLine(E.join(E.str('|PUSH d='), E.join(E.var('jsd'), E.join(E.str(' root=['), E.join(E.var('jsroot'), E.str(']')))))),",
  "      ...L.outLine(E.join(E.str('|JROOT=['), E.join(E.var('jsroot'), E.str(']')))),"];
for(const d of del){ const i=c.indexOf(d); if(i>=0){ const ls=c.lastIndexOf(String.fromCharCode(10), i); const le=c.indexOf(String.fromCharCode(10), i); c=c.slice(0,ls+1)+c.slice(le+1); n++; } else console.log('miss', d.slice(20,40)); }
fs.writeFileSync(P,c); console.log('removed',n);
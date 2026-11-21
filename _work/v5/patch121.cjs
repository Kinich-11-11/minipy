const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const del=["      ...L.outLine(E.join(E.str('|JT=['), E.join(E.var('jt'), E.str(']')))),",
  "      ...L.outLine(E.join(E.str('|JROOT=['), E.join(E.var('jsroot'), E.str(']')))),",
  "            ...L.outLine(E.join(E.str('|CONT root=['), E.join(E.var('jsroot'), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('|END root=['), E.join(E.var('jsroot'), E.str(']')))),"];
for(const d of del){ const i=c.indexOf(d); if(i>=0){ const ls=c.lastIndexOf(String.fromCharCode(10), i); const le=c.indexOf(String.fromCharCode(10), i); c=c.slice(0,ls+1)+c.slice(le+1); n++; } else console.log('miss'); }
fs.writeFileSync(P,c); console.log('removed',n);
// also drop the regdbg/regvar instrumentation from regalloc
const R='D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let r=fs.readFileSync(R,'utf8');
const A="    if (process.env.V5_REGDBG) {"+String.fromCharCode(10);
const i2=r.indexOf(A);
if(i2>=0){ const j2=r.indexOf("    }"+String.fromCharCode(10), r.indexOf('for (const k in byColor)')); if(j2>0){ r=r.slice(0,i2)+r.slice(j2+6); console.log('regdbg removed'); } }
const B="    if (process.env.V5_REGVAR) {"+String.fromCharCode(10);
const i3=r.indexOf(B);
if(i3>=0){ let depth=0, k3=i3, end=-1; while(k3<r.length){ if(r[k3]==='{')depth++; else if(r[k3]==='}'){ depth--; if(depth===0){ end=k3+1; break; } } k3++; } r=r.slice(0,i3)+r.slice(end+1); console.log('regvar removed'); }
fs.writeFileSync(R,r);
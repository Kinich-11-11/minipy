const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
const N=String.fromCharCode(10);
let c=fs.readFileSync(P+'vm.js','utf8');
// drop the temporary debug line
c=c.split(N+"      ...L.outLine(E.join(E.str('DBG mif=')").join(N+"      ...L.outLine(E.join(E.str('DBG mif=')").split(N+"      ...L.outLine(E.join(E.str('DBG mif=')").join(N+"      ...L.outLine(E.join(E.str('DBG mif=')");
const dbgStart = "      ...L.outLine(E.join(E.str('DBG mif=')";
if(c.includes(dbgStart)){
  const i=c.indexOf(dbgStart);
  const j=c.indexOf(N, i);
  c = c.slice(0, i) + c.slice(j+1);
  console.log('dbg removed');
}
let ok=0;
const o1="        ...callUser(E.var('mif')),";
const n1="        ...L.payInto(E.var('mif'), 'mifid'),"+N+"        ...callUser(E.var('mifid')),";
if(c.includes(o1)){ c=c.split(o1).join(n1); ok++; } else console.log('MISS callUser');
fs.writeFileSync(P+'vm.js', c);
console.log('applied', ok, '/1');

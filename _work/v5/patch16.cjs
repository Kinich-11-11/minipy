const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/';
const N=String.fromCharCode(10);
let c=fs.readFileSync(P+'compiler.js','utf8');
// remove debug lines
for (const tag of ["DBGL lab=", "DBGD "]) {
  const start = "              ...L.outLine(E.join(E.str('" + tag + "')";
  while (true) {
    const i = c.indexOf(start);
    if (i < 0) break;
    const j = c.indexOf(N, i);
    c = c.slice(0, i) + c.slice(j + 1);
  }
  const s2 = "                ...L.outLine(E.join(E.str('" + tag + "')";
  while (true) {
    const i = c.indexOf(s2);
    if (i < 0) break;
    const j = c.indexOf(N, i);
    c = c.slice(0, i) + c.slice(j + 1);
  }
}
const o = "  const doLabel = (lab) => [" + N + "    ...L.setAt('Lpc', lab, herePc()),";
const n = "  const doLabel = (lab) => [" + N +
  "    S.Until(E.ge(E.len('Lpc'), lab), [S.ladd('Lpc', E.num(0))])," + N +
  "    ...L.setAt('Lpc', lab, herePc()),";
if(c.includes(o)){ c=c.split(o).join(n); console.log('doLabel padded'); } else console.log('MISS doLabel');
fs.writeFileSync(P+'vm.js'===P+'vm.js' ? P+'compiler.js' : P+'compiler.js', c);
console.log('debug lines removed, compiler.js written');

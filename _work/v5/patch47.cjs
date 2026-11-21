const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let c=fs.readFileSync(P,'utf8');
const A="  for (const s of topScripts) {";
const B=[
  "  // cross-script variables cannot be pooled (scripts interleave at yield points) and are",
  "  // kept on their own slot for now.",
  "  for (const v of referenced) {",
  "    if (varScripts[v].size > 1) { assign[v] = v; newVars[v] = [varsDict[v][0], varsDict[v][1]]; pinnedCount++; }",
  "  }",
  "  for (const s of topScripts) {"
].join(String.fromCharCode(10));
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('globals preserved'); } else console.log('MISS');
fs.writeFileSync(P,c);
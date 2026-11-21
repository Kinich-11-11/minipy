const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let c=fs.readFileSync(P,'utf8');
const A="    const webOf = Object.create(null);   // var -> smallest region containing all its references"
const B="    if (process.env.V5_REGVAR) {"+String.fromCharCode(10)+"      for (const v of cand) {"+String.fromCharCode(10)+"        if (varsDict[v][0] !== process.env.V5_REGVAR) continue;"+String.fromCharCode(10)+"        console.log('[regvar]', varsDict[v][0], 'script', s);"+String.fromCharCode(10)+"        for (const id of Object.keys(blocks)) { const f = blocks[id].fields; if (!f || !f.VARIABLE || f.VARIABLE[1] !== v) continue;"+String.fromCharCode(10)+"          console.log('   ref', blocks[id].opcode, 'region', regionOf[id], 'isRoot', regionOf[id] === s, 'parentChain', (() => { let x = regionOf[id], n = 0; while (x !== undefined && regParent[x] !== undefined && n++ < 30) x = regParent[x]; return x === s; })()); }"+String.fromCharCode(10)+"      }"+String.fromCharCode(10)+"    }"+String.fromCharCode(10)+A
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('regvar added'); } else console.log('MISS');
fs.writeFileSync(P,c);
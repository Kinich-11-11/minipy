const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let c=fs.readFileSync(P,'utf8');
const A="    for (const v of cand) {"+String.fromCharCode(10)+"      const nid = 'v5s' + s + '_' + color[v];"
const B="    if (process.env.V5_REGDBG) {"+String.fromCharCode(10)+"      const byColor = Object.create(null);"+String.fromCharCode(10)+"      for (const v of cand) { const k = color[v]; (byColor[k] = byColor[k] || []).push(varsDict[v][0] + '(web=' + (webOf[v]||'?') + ',chain=' + (chainOf[v]?chainOf[v].size:0) + ')'); }"+String.fromCharCode(10)+"      for (const k in byColor) { const arr = byColor[k]; if (arr.length > 1) console.log('[regdbg] script', s, 'color', k, '->', arr.slice(0, 6).join(' | ')); }"+String.fromCharCode(10)+"    }"+String.fromCharCode(10)+A
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('regdbg added'); } else console.log('MISS');
fs.writeFileSync(P,c);
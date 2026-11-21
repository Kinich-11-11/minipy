const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); const b2=b.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// 1) drop the recursive torepr helper (build-time infinite expansion)
const R="  // Python renders strings with quotes inside containers (str(list) == repr(list)).\n  const torepr = (v, dst) => [\n    S.set('trv', v), S.set(dst, E.str('')),\n    S.If(E.eq(E.letter(E.num(1), E.var('trv')), E.str('S')), [\n      ...L.payInto(E.var('trv'), 'trp'),\n      S.set(dst, E.join(E.str(\"'\"), E.join(E.var('trp'), E.str(\"'\")))),\n    ], [\n      ...tostr(E.var('trv'), dst),\n    ]),\n  ];\n";
if(c.indexOf(R)>=0){ c=c.replace(R,''); n++; } else bad.push('rm-repr');
// 2) container elements go back to the leaf renderer
rep("...torepr(heapGet(E.var('tso'), E.var('i')), 'tsx'),", "...tostr1(heapGet(E.var('tso'), E.var('i')), 'tsx'),", 'call');
// 3) tostr1 quotes string payloads
rep("      S.If(E.eq(E.var('t1g'), E.str('S')), [...L.payInto(E.var('t1v'), 't1p'), S.set(dst, E.var('t1p'))]),",
    "      S.If(E.eq(E.var('t1g'), E.str('S')), [...L.payInto(E.var('t1v'), 't1p'),"+String.fromCharCode(10)+"        S.set(dst, E.join(E.str(\"'\"), E.join(E.var('t1p'), E.str(\"'\"))))]),", 'quote');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));
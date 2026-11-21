const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// index errors become catchable
rep("          ...L.failAt(E.join(E.str('IndexError: str index '), E.var('nidx')), E.var('pc')),", "          ...raiseBuiltin('IndexError'),", 'idx1');
rep("          ...L.failAt(E.join(E.str('IndexError: list index '), E.var('nidx')), E.var('pc')),", "          ...raiseBuiltin('IndexError'),", 'idx2');
// guard the tail of subsBlock so a raised exception does not also push a result
rep("      S.set('res', E.str('')), S.set('rt', E.str('R')),"+NL+"      S.If(E.and(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')), E.eq(E.var('n'), E.num(2))), [", "      S.set('res', E.str('')), S.set('rt', E.str('R')), S.set('raised', E.num(0)),"+NL+"      S.If(E.and(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')), E.eq(E.var('n'), E.num(2))), [", 'reset');
const tail=["      S.chg('sp', E.mul(E.num(-1), E.var('n'))),","      ...vpush(E.var('res')),","    ];","  }","  function subsSetBlock() {"].join(NL);
const tailNew=["      S.If(E.eq(E.var('raised'), E.num(0)), [","        S.chg('sp', E.mul(E.num(-1), E.var('n'))),","        ...vpush(E.var('res')),","      ]),","    ];","  }","  function subsSetBlock() {"].join(NL);
rep(tail, tailNew, 'guard');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));
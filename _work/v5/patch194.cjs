const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("      S.set('kwlam', E.var('kwpend')),",
    "      S.set('kwlam', E.var('kwpend'))," + NL + "      S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('LAM kwpend=['), E.join(E.var('kwpend'), E.str(']'))))]),", 'probe lam');
rep("        ...P.pushV(E.var('l0'), E.var('kwlam')),",
    "        ...P.pushV(E.var('l0'), E.var('kwlam'))," + NL + "        S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('LAM close kwlam=['), E.join(E.var('kwlam'), E.str(']'))))]),", 'probe close');
rep("        ...U.nodeFromStack('t3', E.str('call'), E.var('kws'), P.ctxA(), E.var('cn'), 'kws'),",
    "        ...U.nodeFromStack('t3', E.str('call'), E.var('kws'), P.ctxA(), E.var('cn'), 'kws')," + NL + "        S.If(E.eq(E.var('dbg2'), E.num(1)), [...L.outLine(E.join(E.str('CALL kws=['), E.join(E.var('kws'), E.str(']'))))]),", 'probe call');
fs.writeFileSync(P, s);
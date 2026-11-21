const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)),",
    "S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)), S.set('t0', E.days2000()),", 'clock init');
rep("S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.eq(E.mod(E.var('ticks'), E.num(2000)), E.num(0))), [",
    "S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.and(E.eq(E.mod(E.var('ticks'), E.num(1000)), E.num(0)), E.ge(E.mul(E.sub(E.days2000(), E.var('t0')), E.num(86400000)), E.num(16)))), [", 'time slice');
rep("S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),",
    "S.set('t0', E.days2000()), S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),", 'reset clock');
fs.writeFileSync(p, s);
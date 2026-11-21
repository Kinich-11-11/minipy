const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
// 1. initialise the frame clock at the start of vm_run
const a1 = "    S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)),";
const b1 = "    S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)), S.set('t0', E.days2000()),";
if (s.indexOf(a1) < 0) { console.log('MISS init'); process.exit(1); }
s = s.replace(a1, b1);
// 2. time sliced yields in run mode, one instruction per frame in step mode
const a2 = ["      S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.eq(E.mod(E.var('ticks'), E.num(2000)), E.num(0))), [",
  "        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),",
  "      ]),"].join(NL);
const b2 = ["      S.If(E.eq(E.var('speed'), E.num(0)), [",
  "        // step mode: exactly one instruction per frame so the UI can single step",
  "        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),",
  "      ], [",
  "        // run mode: yield once ~16ms of wall clock has been burnt, so throughput is",
  "        // bounded by time rather than by a fixed instruction count",
  "        S.If(E.eq(E.mod(E.var('ticks'), E.num(1000)), E.num(0)), [",
  "          S.If(E.ge(E.mul(E.sub(E.days2000(), E.var('t0')), E.num(86400000)), E.num(16)), [",
  "            S.set('t0', E.days2000()),",
  "            S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),",
  "          ]),",
  "        ]),",
  "      ]),"].join(NL);
if (s.indexOf(a2) < 0) { console.log('MISS yield'); process.exit(1); }
s = s.replace(a2, b2);
fs.writeFileSync(p, s);
console.log('time sliced yield installed');
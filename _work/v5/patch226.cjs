const fs = require('fs');
const NL = String.fromCharCode(10);
const I = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
function ed(file, a, b, tag) {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.slice(0, i) + b + s.slice(i + a.length));
  console.log('ok ' + tag);
}
// 1. RUN hat: disarm first, then honour `#!bp <pc>`
ed(I, "    S.set('steps', E.num(0))," + NL + "    S.set('pc', E.num(0)),",
   ["    S.set('steps', E.num(0)),",
    "    S.set('pc', E.num(0)),",
    "    // debugger: `#!bp <pc>` stops the VM before executing that instruction",
    "    S.set('bp', E.num(0)),",
    "    S.If(E.eq(E.item('Code', E.num(1)), E.str('#!bp')), [",
    "      S.set('bp', E.item('Code', E.num(2))),",
    "      S.set('status', E.join(E.str('Breakpoint armed at '), E.var('bp'))),",
    "    ]),"].join(NL), 'bp arm');
// 2. main loop: stop before the instruction whose address is the breakpoint
ed(V, "      S.set('op', E.item('Iop', E.var('pc')))," + NL + "      S.If(E.eq(E.var('dbg'), E.num(2)), [",
   ["      S.If(E.and(E.gt(E.var('bp'), E.num(0)), E.eq(E.var('pc'), E.var('bp'))), [",
    "        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.set('halted', E.num(1)),",
    "        S.set('status', E.join(E.str('Breakpoint at '), E.var('pc'))),",
    "      ]),",
    "      S.set('op', E.item('Iop', E.var('pc'))),",
    "      S.If(E.eq(E.var('dbg'), E.num(2)), ["].join(NL), 'bp hit');
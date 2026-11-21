const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
const newTree = "  // Opcode dispatch: the hottest opcodes are compared first in a flat chain, the rest go\n  // through a tree over the first letter so a cold opcode costs ~2 comparisons, not ~45.\n  const HOT_OP = ['PUSHV', 'BIN', 'PUSHK', 'STOREV', 'JMP', 'JZ', 'CALL', 'POP', 'ITER', 'NEXT',\n    'SUBS', 'CMP', 'PUSHN', 'DUP', 'RET', 'UN', 'BUILD', 'LAMBDA', 'GETATTR', 'METH', 'DELV', 'NOP',\n    'HALT', 'PUSHK', 'SUBSSET'];\n  const HOT_FLAT = 14;\n  function dispatchTree(op, items) {\n    const out = [];\n    const rest = [];\n    for (const [o, body] of items) {\n      const i = HOT_OP.indexOf(o);\n      if (i >= 0 && i < HOT_FLAT) out.push(S.If(E.eq(op(), E.str(o)), body));\n      else rest.push([o, body]);\n    }\n    const groups = new Map();\n    for (const [o, body] of rest) {\n      const L = o.charAt(0);\n      if (!groups.has(L)) groups.set(L, []);\n      groups.get(L).push([o, body]);\n    }\n    const hotLetter = [];\n    for (const [o] of rest) { const L = o.charAt(0); if (hotLetter.indexOf(L) < 0) hotLetter.push(L); }\n    const build = (i) => {\n      if (i >= hotLetter.length) return [];\n      const L = hotLetter[i];\n      const inner = groups.get(L).map(([o, body]) => S.If(E.eq(op(), E.str(o)), body));\n      return [S.If(E.eq(E.letter(E.num(1), op()), E.str(L)), inner, build(i + 1))];\n    };\n    for (const st of build(0)) out.push(st);\n    return out;\n  }\n";
const a = '  // The opcode dispatch is a decision tree over the first letter of the opcode: the';
const b = '  function dispatch() {';
const i = s.indexOf(a), j = s.indexOf(b, i);
if (i < 0 || j < 0) { console.log('MISS tree region ' + i + ' ' + j); process.exit(1); }
s = s.slice(0, i) + newTree + s.slice(j);
// loop body: hoist the trace flag and replace the modulo clock check with a countdown
function rep(x, y, tag) {
  const k = s.indexOf(x);
  if (k < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, k) + y + s.slice(k + x.length);
  console.log('ok ' + tag);
}
rep("S.If(E.eq(E.item('Code', E.num(1)), E.str('#!trace')), [",
    "S.If(E.eq(E.var('dbg'), E.num(2)), [", 'trace hoist');
rep("S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)), S.set('t0', E.days2000()),",
    "S.set('pc', E.num(1)), S.set('halted', E.num(0)), S.set('ticks', E.num(0)), S.set('t0', E.days2000()), S.set('nchk', E.num(0)), S.set('dbg', E.num(0)), S.If(E.eq(E.item('Code', E.num(1)), E.str('#!trace')), [S.set('dbg', E.num(2))]),", 'dbg init');
rep("S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.and(E.eq(E.mod(E.var('ticks'), E.num(1000)), E.num(0)), E.ge(E.mul(E.sub(E.days2000(), E.var('t0')), E.num(86400000)), E.num(16)))), [",
    "S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.gt(E.var('ticks'), E.var('nchk'))), [S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.ge(E.mul(E.sub(E.days2000(), E.var('t0')), E.num(86400000)), E.num(16))), [", 'countdown');
rep("S.set('t0', E.days2000()), S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),",
    "S.set('t0', E.days2000()), S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),]), S.set('nchk', E.add(E.var('ticks'), E.num(2000))),", 'countdown close');
fs.writeFileSync(p, s);
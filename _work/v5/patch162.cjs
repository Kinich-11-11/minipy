const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
const newTree = "  // Opcode dispatch is a tree over the first letter of the opcode.  Comparing full\n  // opcode strings is the expensive part (Cast.compare falls back to lower-cased string\n  // comparison), so the tree keeps the hot opcodes at 1-3 comparisons instead of ~20.\n  const HOT_OP = ['PUSHV', 'PUSHK', 'BIN', 'STOREV', 'JMP', 'JZ', 'CALL', 'POP', 'ITER', 'NEXT',\n    'SUBS', 'CMP', 'PUSHN', 'DUP', 'RET', 'UN', 'BUILD', 'LAMBDA', 'GETATTR', 'METH', 'DELV', 'NOP',\n    'HALT', 'SUBSSET', 'PUSHK'];\n  const HOT_LETTER = ['P', 'B', 'J', 'S', 'C', 'N', 'D', 'I', 'G', 'U', 'M', 'R', 'L', 'A', 'T', 'E', 'H'];\n  function dispatchTree(op, items) {\n    const groups = new Map();\n    for (const [o, body] of items) {\n      const L = o.charAt(0);\n      if (!groups.has(L)) groups.set(L, []);\n      groups.get(L).push([o, body]);\n    }\n    const rank = (o) => { const i = HOT_OP.indexOf(o); return i < 0 ? 999 : i; };\n    const letters = [...groups.keys()].sort((a, b) => {\n      const ia = HOT_LETTER.indexOf(a), ib = HOT_LETTER.indexOf(b);\n      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);\n    });\n    const build = (i) => {\n      if (i >= letters.length) return [];\n      const L = letters[i];\n      const inner = groups.get(L).slice().sort((a, b) => rank(a[0]) - rank(b[0]))\n        .map(([o, body]) => S.If(E.eq(op(), E.str(o)), body));\n      return [S.If(E.eq(E.letter(E.num(1), op()), E.str(L)), inner, build(i + 1))];\n    };\n    return build(0);\n  }\n";
const a = '  // Opcode dispatch: the hottest opcodes are compared first in a flat chain, the rest go';
const b = '  function dispatch() {';
const i = s.indexOf(a), j = s.indexOf(b, i);
if (i < 0 || j < 0) { console.log('MISS ' + i + ' ' + j); process.exit(1); }
s = s.slice(0, i) + newTree + s.slice(j);
fs.writeFileSync(p, s);
console.log('tree restored');
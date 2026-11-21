const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
const tree = "  // The opcode dispatch is a decision tree over the first letter of the opcode: the\n  // hottest opcodes are one or two comparisons away instead of ~20 (a flat chain).\n  const HOT_LETTER = ['P', 'B', 'J', 'C', 'S', 'G', 'N', 'D', 'U', 'I', 'M', 'L', 'R', 'A', 'T', 'E', 'H'];\n  const HOT_OP = ['PUSHV', 'PUSHK', 'BIN', 'STOREV', 'JMP', 'JZ', 'CALL', 'ITER', 'NEXT', 'POP',\n    'PUSHN', 'SUBS', 'CMP', 'DUP', 'GETATTR', 'METH', 'BUILD', 'UN', 'RET', 'LAMBDA', 'DELV', 'NOP'];\n  function dispatchTree(op, items) {\n    const groups = new Map();\n    for (const [o, body] of items) {\n      const L = o.charAt(0);\n      if (!groups.has(L)) groups.set(L, []);\n      groups.get(L).push([o, body]);\n    }\n    const rank = (o) => { const i = HOT_OP.indexOf(o); return i < 0 ? 999 : i; };\n    const letters = [...groups.keys()].sort((a, b) => {\n      const ia = HOT_LETTER.indexOf(a), ib = HOT_LETTER.indexOf(b);\n      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);\n    });\n    const build = (i) => {\n      if (i >= letters.length) return [];\n      const L = letters[i];\n      const inner = groups.get(L).slice().sort((a, b) => rank(a[0]) - rank(b[0]))\n        .map(([o, body]) => S.If(E.eq(op(), E.str(o)), body));\n      return [S.If(E.eq(E.letter(E.num(1), op()), E.str(L)), inner, build(i + 1))];\n    };\n    return build(0);\n  }\n";
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
rep("const ia = () => E.item('Ia', E.var('pc'));    const is = (o, body) => S.If(E.eq(op(), E.str(o)), body);",
    "const ia = () => E.item('Ia', E.var('pc'));" + NL + "    const items = [];" + NL + "    const is = (o, body) => { items.push([o, body]); };", 'collector');
rep("      is('IMPORTFROM', [])," + NL + "    ];",
    "      is('IMPORTFROM', [])," + NL + "      ...dispatchTree(op, items)," + NL + "    ];", 'tree hookup');
rep("  function dispatch() {", tree + "  function dispatch() {", 'tree helper');
fs.writeFileSync(p, s);
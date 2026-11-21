const fs = require('fs');
const NL = String.fromCharCode(10);
// --- fix pruneNl to use the Scratch list delete block ---
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const crlf = NL.split('').length ? String.fromCharCode(13) + NL : NL;
const oldA = ["        S.If(E.gt(E.item('NlFr', E.var('npi')), E.var('frTop')), [",
  "          ...listRemoveAt('NlFr', E.var('npi')),",
  "          ...listRemoveAt('NlName', E.var('npi')),",
  "        ], [S.chg('npi', E.num(1))]),"].join(NL);
const newA = ["        S.If(E.gt(E.item('NlFr', E.var('npi')), E.var('frTop')), [",
  "          S.ldel('NlFr', E.var('npi')),",
  "          S.ldel('NlName', E.var('npi')),",
  "        ], [S.chg('npi', E.num(1))]),"].join(NL);
let i = v.indexOf(oldA);
if (i < 0) { i = v.indexOf(oldA.split(NL).join(crlf)); if (i < 0) { console.log('MISS pruneNl'); process.exit(1); } v = v.slice(0, i) + newA.split(NL).join(crlf) + v.slice(i + oldA.split(NL).join(crlf).length); }
else v = v.slice(0, i) + newA + v.slice(i + oldA.length);
fs.writeFileSync(V, v);
console.log('pruneNl fixed');
// --- remove dsl instrumentation ---
const P = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(P, 'utf8');
s = s.split(NL + '    if (op === undefined) { console.log("UNDEF-OP stack:", new Error().stack.split(String.fromCharCode(10)).slice(1, 8).join(String.fromCharCode(10))); throw new Error("undefined op"); }').join('');
s = s.split(NL + '    if (!node || node.op === undefined) { console.log("UNDEF NODE " + JSON.stringify(node) + " | parent=" + ((t.blocks[parentId] || {}).opcode) + " script=" + t.name + " top=" + ((t.blocks[parentId]||{}).topLevel)); }').join('');
const itemNew = ["  item: (list, i) => {",
  "    if (typeof i === 'string') { console.log('ITEM-STR ' + i + String.fromCharCode(10) + new Error().stack.split(String.fromCharCode(10)).slice(1, 6).join(String.fromCharCode(10))); }",
  "    return blk('data_itemoflist', [['INDEX', i, 'rep']], { LIST: list });",
  "  },"].join(NL);
s = s.split(itemNew).join("  item: (list, i) => blk('data_itemoflist', [['INDEX', i, 'rep']], { LIST: list }),");
fs.writeFileSync(P, s);
console.log('dsl restored, has UNDEF:', s.indexOf('UNDEF') >= 0, 'has ITEM-STR:', s.indexOf('ITEM-STR') >= 0);
const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
// remove the three probes
rep("      ...L.outLine(E.join(E.str('LAM kwpend=['), E.join(E.var('kwpend'), E.str(']'))))," + NL, '', 'probe1');
rep("        ...L.outLine(E.join(E.str('LAM close kwlam=['), E.join(E.var('kwlam'), E.str(']'))))," + NL, '', 'probe2');
rep("        ...L.outLine(E.join(E.str('CALL kws=['), E.join(E.var('kws'), E.str(']'))))," + NL, '', 'probe3');
// pushV reads kwpend itself, so the lambda must put the saved kwarg name back first
rep("        ...P.pushV(E.var('l0'), E.var('kwlam')),",
    "        S.set('kwpend', E.var('kwlam'))," + NL + "        ...P.pushV(E.var('l0')),", 'kwlam restore');
fs.writeFileSync(P, s);
// builtin: sorted(..., reverse=R) without a key must still work
let v = fs.readFileSync(V, 'utf8');
const a2 = "        S.If(E.ge(E.var('nargs'), E.num(3)), [...raiseBuiltin('NotImplementedError')]),";
const b2 = [
  "        S.set('revs', E.num(0)),",
  "        S.If(E.ge(E.var('nargs'), E.num(3)), [",
  "          ...nthField(E.var('cai'), E.num(3), 'kwn'),",
  "          S.If(E.eq(E.var('kwn'), E.str('reverse|0000000')), [",
  "            ...L.payInto(arg(3), 'rvv'),",
  "            S.If(E.eq(E.var('rvv'), E.str('B1')), [S.set('revs', E.num(1))]),",
  "          ], [",
  "            // a key argument reaching the builtin means the compiler could not inline it",
  "            ...raiseBuiltin('NotImplementedError'),",
  "          ]),",
  "        ]),"].join(NL);
if (v.indexOf(a2) < 0) { console.log('MISS reverse'); process.exit(1); }
v = v.replace(a2, b2);
const a3 = "        ...drop()," + NL + "        ...vpush(E.join(E.str('L'), E.var('tobj')))," + NL + "      ])," + NL + "      S.If(E.eq(bn(), E.str('int|000')), [";
const b3 = [
  "        S.If(E.eq(E.var('revs'), E.num(1)), [...listReverse(E.var('tobj'))]),",
  "        ...drop(),",
  "        ...vpush(E.join(E.str('L'), E.var('tobj'))),",
  "      ]),",
  "      S.If(E.eq(bn(), E.str('int|000')), ["].join(NL);
if (v.indexOf(a3) < 0) { console.log('MISS reverse-apply'); process.exit(1); }
v = v.replace(a3, b3);
fs.writeFileSync(V, v);
console.log('sorted reverse handled');
const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
// remove the debug probe
const probe = [
  "        ...L.outLine(E.join(E.str('PROBE fid='), E.var('fid'))),",
  "        ...L.outLine(E.join(E.str('PROBE flag=['), E.join(E.item('FnFlags', E.var('fid')), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('PROBE kind=['), E.join(E.item('FnKind', E.var('fid')), E.str(']')))),"].join(NL);
rep(probe + NL, '', 'probe removed');
// pre-size FnFlags for every builtin: setAt only grows a list by one, so the list must
// already be as long as the highest function index before the first user def is stored.
rep("        ...L.setAt('FnEnv', E.var('fTop'), E.num(0))," + NL + "        ...L.setAt('FnArity', E.var('fTop'), E.num(0))," + NL + "        S.chg('bTop', E.num(1)),",
    "        ...L.setAt('FnEnv', E.var('fTop'), E.num(0))," + NL + "        ...L.setAt('FnArity', E.var('fTop'), E.num(0))," + NL + "        ...L.setAt('FnFlags', E.var('fTop'), E.str(''))," + NL + "        S.chg('bTop', E.num(1)),", 'builtin FnFlags');
// back to the real generator flag
rep("      is('GDEF', [defBlock('XYZ')]),", "      is('GDEF', [defBlock('g')]),", 'flag restored');
fs.writeFileSync(V, s);
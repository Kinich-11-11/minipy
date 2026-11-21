const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
const I = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
function ed(file, a, b, tag) {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.slice(0, i) + b + s.slice(i + a.length));
  console.log('ok ' + tag);
}
ed(I, "'GnFid', 'GnPc', 'GnEnv', 'GnDone', 'NdG',", "'GnFid', 'GnPc', 'GnEnv', 'GnDone', 'GnSp', 'GnStk', 'NdG',", 'lists');
ed(V, "      ...L.setAt('GnDone', E.var(dst), E.num(0)),",
   "      ...L.setAt('GnDone', E.var(dst), E.num(0))," + NL + "      ...L.setAt('GnSp', E.var(dst), E.num(0))," + NL + "      ...L.setAt('GnStk', E.var(dst), E.num(0)),", 'genNew state');
// resume: put the frame's saved stack slots back
ed(V, ["          ...L.setAt('FrBase', E.var('frTop'), E.var('sp')),",
       "          ...L.setAt('FrAux', E.var('frTop'), E.var('gid')),",
       "          ...L.setAt('FrGlob', E.var('frTop'), E.num(0)),"].join(NL),
   ["          ...L.setAt('FrBase', E.var('frTop'), E.var('sp')),",
    "          ...L.setAt('FrAux', E.var('frTop'), E.var('gid')),",
    "          ...L.setAt('FrGlob', E.var('frTop'), E.num(0)),",
    "          S.set('gi', E.num(1)),",
    "          S.Until(E.gt(E.var('gi'), E.item('GnSp', E.var('gid'))), [",
    "            ...vpush(heapGet(E.item('GnStk', E.var('gid')), E.var('gi'))),",
    "            S.chg('gi', E.num(1)),",
    "          ]),"].join(NL), 'resume stack');
// yield: park the frame's live stack slots
ed(V, ["      S.set('gid', E.item('FrAux', E.var('frTop'))),",
       "      ...L.setAt('GnPc', E.var('gid'), E.add(E.var('pc'), E.num(1))),"].join(NL),
   ["      S.set('gid', E.item('FrAux', E.var('frTop'))),",
    "      S.set('gd', E.sub(E.var('sp'), E.item('FrBase', E.var('frTop')))),",
    "      ...heapNew('gsk'), S.set('gi', E.num(1)),",
    "      S.Until(E.gt(E.var('gi'), E.var('gd')), [",
    "        ...heapPush(E.var('gsk'), E.item('Stk', E.add(E.item('FrBase', E.var('frTop')), E.var('gi')))),",
    "        S.chg('gi', E.num(1)),",
    "      ]),",
    "      ...L.setAt('GnStk', E.var('gid'), E.var('gsk')),",
    "      ...L.setAt('GnSp', E.var('gid'), E.var('gd')),",
    "      ...L.setAt('GnPc', E.var('gid'), E.add(E.var('pc'), E.num(1))),"].join(NL), 'yield stack');
const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
function rep(a, b, tag) {
  const i = v.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); return; }
  v = v.slice(0, i) + b + v.slice(i + a.length);
  console.log('ok ' + tag);
}
const nlOld = [
  "      S.ladd('NlFr', E.var('frTop')),",
  "      S.ladd('NlName', E.item('Kval', ia())),"].join(NL);
const nlNew = [
  "      S.set('nspec', E.item('Kval', ia())), S.set('i', E.num(1)), S.set('acc', E.str('')),",
  "      S.Until(E.gt(E.var('i'), E.slen(E.var('nspec'))), [",
  "        S.If(E.eq(E.letter(E.var('i'), E.var('nspec')), E.str(',')), [",
  "          S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [",
  "            S.ladd('NlFr', E.var('frTop')), S.ladd('NlName', E.var('acc')),",
  "          ]),",
  "          S.set('acc', E.str('')),",
  "        ], [",
  "          S.set('acc', E.join(E.var('acc'), E.letter(E.var('i'), E.var('nspec')))),",
  "        ]),",
  "        S.chg('i', E.num(1)),",
  "      ]),",
  "      S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [",
  "        S.ladd('NlFr', E.var('frTop')), S.ladd('NlName', E.var('acc')),",
  "      ]),"].join(NL);
rep(nlOld, nlNew, 'NONLOCAL names');
rep("        ...substrInto(E.var('spec'), E.num(1), E.sub(E.var('split'), E.num(1)), 'cbraw'),",
    "        ...substrInto(E.var('spec'), E.num(2), E.sub(E.var('split'), E.num(2)), 'cbraw'),", 'class base offset');
rep("      S.If(E.gt(E.var('split'), E.num(1)), [", "      S.If(E.gt(E.var('split'), E.num(2)), [", 'class base guard');
fs.writeFileSync(V, v);

const fs = require('fs');
const NL = String.fromCharCode(13) + String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const oldS = ["        ], [",
"          ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd'),",
"        ]),"].join(NL);
const i = v.indexOf(oldS);
if (i < 0) { console.log('MISS still'); process.exit(1); }
const newS = ["        ], [",
"          // a nonlocal declaration in this frame routes the assignment to the",
"          // enclosing function's binding instead of creating a local",
"          S.set('nlm', E.num(0)), S.set('nli', E.num(1)),",
"          S.Until(E.gt(E.var('nli'), E.len('NlFr')), [",
"            S.If(E.and(E.eq(E.item('NlFr', E.var('nli')), E.var('frTop')), E.eq(E.item('NlName', E.var('nli')), ia())), [",
"              S.set('nlm', E.num(1)),",
"            ]),",
"            S.chg('nli', E.num(1)),",
"          ]),",
"          S.If(E.eq(E.var('nlm'), E.num(1)), [",
"            S.set('nlc', E.item('MapParent', E.item('FrEnv', E.var('frTop')))), S.set('nlf', E.num(0)),",
"            S.Until(E.or(E.lt(E.var('nlc'), E.num(1)), E.eq(E.var('nlf'), E.num(1))), [",
"              S.set('bnb', E.item('MapHead', E.var('nlc'))), S.set('bnm', ia()), S.set('bvl', E.var('vb')),",
"              S.Until(E.or(E.eq(E.var('bnb'), E.num(0)), E.eq(E.var('nlf'), E.num(1))), [",
"                S.If(E.eq(E.item('BindName', E.var('bnb')), E.var('bnm')), [",
"                  S.lset('BindVal', E.var('bnb'), E.var('bvl')), S.set('nlf', E.num(1)),",
"                ]),",
"                S.set('bnb', E.item('BindNext', E.var('bnb'))),",
"              ]),",
"              S.If(E.eq(E.var('nlf'), E.num(0)), [S.set('nlc', E.item('MapParent', E.var('nlc')))]),",
"            ]),",
"            S.If(E.eq(E.var('nlf'), E.num(0)), [",
"              ...L.failAt(E.str('NameError: nonlocal binding not found'), E.var('pc')),",
"            ]),",
"          ], [",
"            ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd'),",
"          ]),",
"        ]),"].join(NL);
v = v.slice(0, i) + newS + v.slice(i + oldS.length);
fs.writeFileSync(V, v);
console.log('ok STOREV nonlocal');

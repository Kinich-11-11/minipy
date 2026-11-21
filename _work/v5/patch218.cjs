const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let p = fs.readFileSync(P, 'utf8');
const pa = "        S.If(isO('*'), [" + NL + "          S.set('t7', E.join(E.var('t7'), E.str('*'))), tp1()," + NL + "        ])," + NL;
const pb = "        S.If(isO('**'), [" + NL + "          S.set('t7', E.join(E.var('t7'), E.str('**'))), tp1()," + NL + "        ])," + NL + pa;
if (p.indexOf(pa) < 0) { console.log('MISS parser'); process.exit(1); }
fs.writeFileSync(P, p.replace(pa, pb));
console.log('parser accepts **');
let v = fs.readFileSync(V, 'utf8');
// the parameter accumulator must remember the extra star
const va = "          S.If(E.eq(E.letter(E.var('pn'), E.var('pspec')), E.str('*')), [" + NL + "            S.set('starm', E.num(1))," + NL + "          ], [";
const vb = ["          S.If(E.eq(E.letter(E.var('pn'), E.var('pspec')), E.str('*')), [",
  "            S.If(E.eq(E.var('starm'), E.num(1)), [S.set('starm', E.num(2))], [S.set('starm', E.num(1))]),",
  "          ], ["].join(NL);
if (v.indexOf(va) < 0) { console.log('MISS starm'); process.exit(1); }
v = v.replace(va, vb);
console.log('starm tracks **');
// acc still holds the bare name, so save it before the branch uses acc for other things
const wa = "            S.If(E.eq(E.var('starm'), E.num(1)), [" + NL;
const wb = "            S.set('acc2', E.var('acc'))," + NL + "            S.If(E.eq(E.var('starm'), E.num(2)), [" + NL + "              // **kwargs: every keyword argument no parameter claimed, as a dict\n              ...mapNew('kwd', E.num(0), E.str('D')),\n              S.set('f2', E.num(2)),\n              S.Until(E.gt(E.var('f2'), E.var('nargs')), [\n                ...nthField(E.var('cai'), E.var('f2'), 'kfn'),\n                S.If(E.gt(E.slen(E.var('kfn')), E.num(0)), [\n                  S.set('kclaim', E.num(0)), S.set('pi2', E.num(1)), S.set('pnm2', E.str('')),\n                  S.Until(E.gt(E.var('pi2'), E.slen(E.var('pspec'))), [\n                    S.If(E.eq(E.letter(E.var('pi2'), E.var('pspec')), E.str(';')), [\n                      S.If(E.eq(E.var('pnm2'), E.var('kfn')), [S.set('kclaim', E.num(1))]),\n                      S.set('pnm2', E.str('')),\n                    ], [\n                      S.set('pnm2', E.join(E.var('pnm2'), E.letter(E.var('pi2'), E.var('pspec')))),\n                    ]),\n                    S.chg('pi2', E.num(1)),\n                  ]),\n                  S.If(E.eq(E.var('kclaim'), E.num(0)), [\n                    S.set('kyt', E.var('kfn')), S.set('kyi', E.num(1)), S.set('kyn', E.str('')),\n                    S.Until(E.or(E.gt(E.var('kyi'), E.slen(E.var('kyt'))),\n                      E.eq(E.letter(E.var('kyi'), E.var('kyt')), E.str('|'))), [\n                      S.set('kyn', E.join(E.var('kyn'), E.letter(E.var('kyi'), E.var('kyt')))),\n                      S.chg('kyi', E.num(1)),\n                    ]),\n                    ...keyOf(E.var('kyn'), 'kyk'),\n                    ...bindSet(E.var('kwd'), E.var('kyk'), E.item('Stk', E.add(E.var('ubase'), E.var('f2'))), 'fd9'),\n                  ]),\n                ]),\n                S.chg('f2', E.num(1)),\n              ]),\n              ...bindSet(E.var('uenv'), E.var('acc2'), E.var('kwd'), 'fd10')," + NL + "            ], [" + NL + "            S.If(E.eq(E.var('starm'), E.num(1)), [" + NL;
if (v.indexOf(wa) < 0) { console.log('MISS kwargs hook'); process.exit(1); }
v = v.replace(wa, wb);
// close the extra else we opened
const xa = "            ])," + NL + "          ])," + NL + "          S.set('acc', E.str('')), S.set('starm', E.num(0)),";
const xb = "            ])," + NL + "            ])," + NL + "          ])," + NL + "          S.set('acc', E.str('')), S.set('starm', E.num(0)),";
if (v.indexOf(xa) < 0) { console.log('MISS close'); process.exit(1); }
v = v.replace(xa, xb);
fs.writeFileSync(V, v);
console.log('kwargs collection installed');
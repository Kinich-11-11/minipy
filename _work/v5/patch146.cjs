
const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';

function splice(src, startMark, endMark, repl, tag) {
  const a = src.indexOf(startMark);
  if (a < 0) { console.log('MISS start ' + tag); return src; }
  const b = src.indexOf(endMark, a);
  if (b < 0) { console.log('MISS end ' + tag); return src; }
  console.log('ok ' + tag);
  return src.slice(0, a) + repl + src.slice(b);
}
function rep(src, oldS, newS, tag) {
  const i = src.indexOf(oldS);
  if (i < 0) { console.log('MISS ' + tag); return src; }
  console.log('ok ' + tag);
  return src.slice(0, i) + newS + src.slice(i + oldS.length);
}

let p = fs.readFileSync(P, 'utf8');
p = rep(p,
"              S.If(E.eq(P.ctxT(), E.str('M')), [...finalizeCtx()], [L.failAt(E.str('SyntaxError: unexpected )'), E.item('TokL', E.var('tp')))]),",
[
"              S.If(E.eq(P.ctxT(), E.str('M')), [",
"                // one ')' closes both the lambda body and the bracket it sits in",
"                ...finalizeCtx(),",
"                S.If(E.eq(E.var('err'), E.str('')), [",
"                  S.If(E.or(E.eq(P.ctxT(), E.str('G')), E.eq(P.ctxT(), E.str('C'))), [...finalizeCtx()]),",
"                ]),",
"              ], [L.failAt(E.str('SyntaxError: unexpected )'), E.item('TokL', E.var('tp')))]),"
].join(NL), 'parse close-paren');
fs.writeFileSync(P, p);

let v = fs.readFileSync(V, 'utf8');

const cmpNew = [
"  // -1 / 0 / 1 ordering used by CMP, min/max and sort.",
"  function charOrder(sa, sb, dst) {",
"    return [",
"      S.set('oci', E.num(1)), S.set(dst, E.num(0)),",
"      S.Until(E.or(E.gt(E.var('oci'), E.slen(sa)), E.not(E.eq(E.var(dst), E.num(0)))), [",
"        S.set('oca', E.str('')), S.set('ocb', E.str('')),",
"        S.If(E.not(E.gt(E.var('oci'), E.slen(sb))), [",
"          ...L.charCode(E.letter(E.var('oci'), sa), 'oca'),",
"          ...L.charCode(E.letter(E.var('oci'), sb), 'ocb'),",
"          S.If(E.lt(E.var('oca'), E.var('ocb')), [S.set(dst, E.num(-1))]),",
"          S.If(E.gt(E.var('oca'), E.var('ocb')), [S.set(dst, E.num(1))]),",
"        ]),",
"        S.chg('oci', E.num(1)),",
"      ]),",
"      S.If(E.eq(E.var(dst), E.num(0)), [",
"        S.If(E.lt(E.slen(sa), E.slen(sb)), [S.set(dst, E.num(-1))]),",
"        S.If(E.gt(E.slen(sa), E.slen(sb)), [S.set(dst, E.num(1))]),",
"      ]),",
"    ];",
"  }",
"  function scalarOrder(va, vb, dst) {",
"    return [",
"      S.set(dst, E.num(0)),",
"      S.If(E.and(L.isNum(va), L.isNum(vb)), [",
"        ...L.payInto(va, 'ona'), ...L.payInto(vb, 'onb'),",
"        S.If(E.lt(E.var('ona'), E.var('onb')), [S.set(dst, E.num(-1))]),",
"        S.If(E.gt(E.var('ona'), E.var('onb')), [S.set(dst, E.num(1))]),",
"      ], [",
"        // comparing the tagged text keeps tags apart: S-empty never equals Z",
"        ...charOrder(va, vb, dst),",
"      ]),",
"    ];",
"  }",
"  const seqTag = (x) => E.or(E.eq(E.letter(E.num(1), x), E.str('L')), E.eq(E.letter(E.num(1), x), E.str('T')));",
"  // lexicographic comparison of two lists/tuples.  Code generators cannot recurse,",
"  // so nested pairs go on an explicit work stack of [idA, idB, nextIndex] frames.",
"  function seqOrder(va, vb, dst) {",
"    return [",
"      S.ldelall('CSst'),",
"      ...L.payInto(va, 'ocq'), ...L.payInto(vb, 'ocq2'),",
"      S.ladd('CSst', E.var('ocq')), S.ladd('CSst', E.var('ocq2')), S.ladd('CSst', E.num(0)),",
"      S.set('CSn', E.num(1)), S.set('CSdn', E.num(0)), S.set(dst, E.num(0)),",
"      S.Until(E.or(E.lt(E.var('CSn'), E.num(1)), E.eq(E.var('CSdn'), E.num(1))), [",
"        S.set('CSa', E.item('CSst', E.sub(E.mul(E.var('CSn'), E.num(3)), E.num(2)))),",
"        S.set('CSb', E.item('CSst', E.sub(E.mul(E.var('CSn'), E.num(3)), E.num(1)))),",
"        S.set('CSi', E.item('CSst', E.mul(E.var('CSn'), E.num(3)))),",
"        S.set('CSla', E.item('LCount', E.var('CSa'))), S.set('CSlb', E.item('LCount', E.var('CSb'))),",
"        S.If(E.and(E.ge(E.var('CSi'), E.var('CSla')), E.ge(E.var('CSi'), E.var('CSlb'))), [",
"          S.chg('CSn', E.num(-1)),",
"        ], [",
"          S.If(E.or(E.ge(E.var('CSi'), E.var('CSla')), E.ge(E.var('CSi'), E.var('CSlb'))), [",
"            S.set(dst, E.num(1)),",
"            S.If(E.lt(E.var('CSla'), E.var('CSlb')), [S.set(dst, E.num(-1))]),",
"            S.set('CSdn', E.num(1)),",
"          ], [",
"            S.set('CSea', heapGet(E.var('CSa'), E.add(E.var('CSi'), E.num(1)))),",
"            S.set('CSeb', heapGet(E.var('CSb'), E.add(E.var('CSi'), E.num(1)))),",
"            S.If(E.and(seqTag(E.var('CSea')), seqTag(E.var('CSeb'))), [",
"              S.lset('CSst', E.mul(E.var('CSn'), E.num(3)), E.add(E.var('CSi'), E.num(1))),",
"              ...L.payInto(E.var('CSea'), 'ocq'), ...L.payInto(E.var('CSeb'), 'ocq2'),",
"              S.ladd('CSst', E.var('ocq')), S.ladd('CSst', E.var('ocq2')), S.ladd('CSst', E.num(0)),",
"              S.chg('CSn', E.num(1)),",
"            ], [",
"              ...scalarOrder(E.var('CSea'), E.var('CSeb'), 'ocm'),",
"              S.If(E.eq(E.var('ocm'), E.num(0)), [",
"                S.lset('CSst', E.mul(E.var('CSn'), E.num(3)), E.add(E.var('CSi'), E.num(1))),",
"              ], [",
"                S.set(dst, E.var('ocm')), S.set('CSdn', E.num(1)),",
"              ]),",
"            ]),",
"          ]),",
"        ]),",
"      ]),",
"    ];",
"  }",
"  function orderOf(va, vb, dst) {",
"    return [S.If(E.and(seqTag(va), seqTag(vb)), [...seqOrder(va, vb, dst)], [...scalarOrder(va, vb, dst)])];",
"  }",
"  function cmpPair(va, vb, sop, dst) {",
"    const op = () => E.var('cop');",
"    return [",
"      S.set('cop', sop),",
"      ...orderOf(va, vb, 'ocm'),",
"      S.set(dst, E.str('B0')),",
"      S.If(E.eq(op(), E.str('==')), [S.If(E.eq(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),",
"      S.If(E.eq(op(), E.str('!=')), [",
"        S.set(dst, E.str('B1')),",
"        S.If(E.eq(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B0'))]),",
"      ]),",
"      S.If(E.eq(op(), E.str('<')), [S.If(E.lt(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),",
"      S.If(E.eq(op(), E.str('>')), [S.If(E.gt(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),",
"      S.If(E.eq(op(), E.str('<=')), [S.If(E.le(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),",
"      S.If(E.eq(op(), E.str('>=')), [S.If(E.ge(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),",
"    ];",
"  }",
""].join(NL);
v = splice(v, "  function cmpPair(va, vb, sop, dst) {", "  function cmpBlock() {", cmpNew, 'cmpPair');

const nlBlock = [
"  function nonlocalBlock() {",
"    const ia = () => E.item('Ia', E.var('pc'));",
"    return [",
"      S.ladd('NlFr', E.var('frTop')),",
"      S.ladd('NlName', E.item('Kval', ia())),",
"    ];",
"  }",
"  function pruneNl() {",
"    return [",
"      S.set('npi', E.num(1)),",
"      S.Until(E.gt(E.var('npi'), E.len('NlFr')), [",
"        S.If(E.gt(E.item('NlFr', E.var('npi')), E.var('frTop')), [",
"          ...listRemoveAt('NlFr', E.var('npi')),",
"          ...listRemoveAt('NlName', E.var('npi')),",
"        ], [S.chg('npi', E.num(1))]),",
"      ]),",
"    ];",
"  }",
""].join(NL);
v = rep(v, "  function retBlock() {", nlBlock + "  function retBlock() {", 'nonlocal helpers');
v = rep(v, "        S.chg('frTop', E.num(-1))," + NL + "        ...vpush(E.var('rv')),",
            "        S.chg('frTop', E.num(-1))," + NL + "        ...pruneNl()," + NL + "        ...vpush(E.var('rv')),", 'ret prune');
const retnOld = "        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1)))," + NL + "        S.chg('frTop', E.num(-1))," + NL + "        S.If(E.gt(E.var('auxv'), E.num(0)), [...vpush(E.join(E.str('C'), E.var('auxv')))]),";
const retnNew = "        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1)))," + NL + "        S.chg('frTop', E.num(-1))," + NL + "        ...pruneNl()," + NL + "        S.If(E.gt(E.var('auxv'), E.num(0)), [...vpush(E.join(E.str('C'), E.var('auxv')))]),";
v = rep(v, retnOld, retnNew, 'retn prune');
v = rep(v, "      is('NONLOCAL', []),", "      is('NONLOCAL', [nonlocalBlock()]),", 'NONLOCAL wire');

const storeOld = "        ], [" + NL + "          ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd')," + NL + "        ]),";
const storeNew = [
"        ], [",
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
v = rep(v, storeOld, storeNew, 'STOREV nonlocal');

const clsOld = [
"      S.chg('cTop', E.num(1)), S.set('clo', E.var('cTop')),",
"      ...L.setAt('ClName', E.var('clo'), E.var('namep')),",
"      ...L.setAt('ClBase', E.var('clo'), E.num(0)),",
"      ...mapNew('cm', E.var('GlobMap'), E.str('C')),",
"      ...L.setAt('ClMap', E.var('clo'), E.var('cm')),"].join(NL);
const clsNew = [
"      S.chg('cTop', E.num(1)), S.set('clo', E.var('cTop')),",
"      ...L.setAt('ClName', E.var('clo'), E.var('namep')),",
"      // bases sit before the #: A|1,#B|1 .  The first one becomes ClBase and the",
"      // parent of the class map, so lookup walks instance -> class -> base -> globals.",
"      S.set('cbbase', E.num(0)),",
"      S.If(E.gt(E.var('split'), E.num(1)), [",
"        ...substrInto(E.var('spec'), E.num(1), E.sub(E.var('split'), E.num(1)), 'cbraw'),",
"        S.set('cbj2', E.num(1)), S.set('cbnm', E.str('')),",
"        S.Until(E.or(E.gt(E.var('cbj2'), E.slen(E.var('cbraw'))),",
"          E.eq(E.letter(E.var('cbj2'), E.var('cbraw')), E.str(','))), [",
"          S.set('cbnm', E.join(E.var('cbnm'), E.letter(E.var('cbj2'), E.var('cbraw')))),",
"          S.chg('cbj2', E.num(1)),",
"        ]),",
"        S.If(E.gt(E.slen(E.var('cbnm')), E.num(0)), [",
"          ...lookupIn(E.var('GlobMap'), E.var('cbnm'), 'cbv'),",
"          S.If(E.eq(E.letter(E.num(1), E.var('cbv')), E.str('C')), [",
"            ...L.payInto(E.var('cbv'), 'cbbase'),",
"          ], [",
"            S.If(E.gt(E.slen(E.var('cbv')), E.num(0)), [",
"              ...L.failAt(E.str('TypeError: base is not a class'), E.var('pc')),",
"            ]),",
"          ]),",
"        ]),",
"      ]),",
"      S.If(E.gt(E.var('cbbase'), E.num(0)), [",
"        ...L.setAt('ClBase', E.var('clo'), E.var('cbbase')),",
"      ], [",
"        ...L.setAt('ClBase', E.var('clo'), E.num(0)),",
"      ]),",
"      S.If(E.gt(E.var('cbbase'), E.num(0)), [",
"        ...mapNew('cm', E.item('ClMap', E.var('cbbase')), E.str('C')),",
"      ], [",
"        ...mapNew('cm', E.var('GlobMap'), E.str('C')),",
"      ]),",
"      ...L.setAt('ClMap', E.var('clo'), E.var('cm')),"].join(NL);
v = rep(v, clsOld, clsNew, 'class base');

v = rep(v, "    S.set('bTop', E.num(0)), S.set('fTop', E.num(0)), S.set('cTop', E.num(0)), S.set('iTop', E.num(0)),",
            "    S.ldelall('NlFr'), S.ldelall('NlName')," + NL +
            "    S.set('bTop', E.num(0)), S.set('fTop', E.num(0)), S.set('cTop', E.num(0)), S.set('iTop', E.num(0)),", 'init clear');
fs.writeFileSync(V, v);
console.log('done');

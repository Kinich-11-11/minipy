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
// 1. defBlock flag + FnFlags
rep('  function defBlock() {', '  function defBlock(flag) {', 'defBlock sig');
rep("      ...L.setAt('FnArity', E.var('fTop'), E.num(0)),",
    "      ...L.setAt('FnArity', E.var('fTop'), E.num(0))," + NL + "      ...L.setAt('FnFlags', E.var('fTop'), E.str(flag === undefined ? '' : flag)),", 'FnFlags');
rep("      is('DEF', [defBlock()]),", "      is('DEF', [defBlock('')])," + NL + "      is('GDEF', [defBlock('g')]),", 'DEF wire');
rep("      is('DELV', [delvBlock()]),", "      is('YIELD', [yieldBlock()])," + NL + "      is('NCHK', [nchkBlock()])," + NL + "      is('DELV', [delvBlock()]),", 'YIELD wire');
// 2. callUser: make the frame push optional
rep("      S.chg('frTop', E.num(1))," + NL + "      ...L.setAt('FrKind', E.var('frTop'), E.str('F')),",
    "      S.If(E.eq(E.var('nofr'), E.num(1)), [], [" + NL + "      S.chg('frTop', E.num(1))," + NL + "      ...L.setAt('FrKind', E.var('frTop'), E.str('F')),", 'nofr open');
rep("      S.set('pc', E.sub(E.item('FnBody', fid), E.num(1)))," + NL + "    ];" + NL + "  }" + NL + "  function instantiate() {",
    "      S.set('pc', E.sub(E.item('FnBody', fid), E.num(1)))," + NL + "      ])," + NL + "    ];" + NL + "  }" + NL + "  function instantiate() {", 'nofr close');
// 3. callBlock: generator creation
rep("        ], [" + NL + "          ...callUser(E.var('fid'))," + NL + "        ])," + NL + "      ])," + NL + "      S.If(E.eq(E.var('ft'), E.str('C')), [instantiate()]),",
    ["        ], [",
          "          S.If(E.eq(E.item('FnFlags', E.var('fid')), E.str('g')), [",
          "            S.set('nofr', E.num(1)),",
          "            ...callUser(E.var('fid')),",
          "            S.set('nofr', E.num(0)),",
          "            ...genNew(E.var('fid'), 'gid'),",
          "            S.set('sp', E.var('ubase')),",
          "            ...vpush(E.join(E.str('G'), E.var('gid'))),",
          "          ], [",
          "            ...callUser(E.var('fid')),",
          "          ]),",
          "        ]),",
          "      ]),",
          "      S.If(E.eq(E.var('ft'), E.str('C')), [instantiate()]),"].join(NL), 'gen call');
// 4. retBlock: generator frame returns by marking done
rep("        S.set('sp', E.item('FrBase', E.var('frTop')))," + NL + "        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1)))," + NL + "        S.chg('frTop', E.num(-1))," + NL + "        ...pruneNl()," + NL + "        ...vpush(E.var('rv')),",
    ["        S.If(E.eq(E.item('FrKind', E.var('frTop')), E.str('G')), [",
      "          S.set('gstop', E.num(1)),",
      "          ...L.setAt('GnDone', E.item('FrAux', E.var('frTop')), E.num(1)),",
      "          S.set('sp', E.item('FrBase', E.var('frTop'))),",
      "          S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),",
      "          S.chg('frTop', E.num(-1)),",
      "          ...pruneNl(),",
      "        ], [",
      "        S.set('sp', E.item('FrBase', E.var('frTop'))),",
      "        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),",
      "        S.chg('frTop', E.num(-1)),",
      "        ...pruneNl(),",
      "        ...vpush(E.var('rv')),",
      "        ]),"].join(NL), 'ret gen');
// 5. ITER passes generators through
rep("      ...vpush(E.var('tobj'))," + NL + "      ...vpush(E.num(0))," + NL + "    ];" + NL + "  }" + NL + "  function nextBlock() {",
    ["      S.If(E.eq(E.letter(E.num(1), E.var('src')), E.str('G')), [",
      "        S.set('gstop', E.num(0)),",
      "        ...vpush(E.var('src')),",
      "      ], [",
      "        ...vpush(E.var('tobj')),",
      "      ]),",
      "      ...vpush(E.num(0)),",
      "    ];",
      "  }",
      "  function nextBlock() {"].join(NL), 'iter gen');
// 6. init state
rep("    S.set('GlobMap', E.num(1)), S.set('mTop', E.num(1)),",
    "    S.set('gTop', E.num(0)), S.set('gstop', E.num(0))," + NL + "    S.set('GlobMap', E.num(1)), S.set('mTop', E.num(1)),", 'init gen');
fs.writeFileSync(V, s);
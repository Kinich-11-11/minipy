const fs = require('fs');
let s = fs.readFileSync('_work/v41/p339.txt', 'utf8');
const startMark = '  // 找 calluser 里 tokenize 调用';
const endMark = '  if (!site) throw new Error(';
const i0 = s.indexOf(startMark), i1 = s.indexOf(endMark);
if (i0 < 0 || i1 < 0) { console.log('MISS locator block'); process.exit(1); }
const lines = [
  '  // 收集 calluser / atom 里所有 tokenize 调用（求值中途会换掉 Tok 的站点）',
  '  const sites = [];',
  '  for (const id of Object.keys(BB)) {',
  '    const b = BB[id];',
  '    if (b.opcode !== "procedures_call" || !b.mutation) continue;',
  '    if (String(b.mutation.proccode).indexOf("tokenize") < 0) continue;',
  '    let cur = id, own = "?";',
  '    for (let i = 0; i < 400 && cur; i++) {',
  '      const q = BB[cur];',
  '      if (!q) break;',
  '      if (q.opcode === "procedures_definition") {',
  '        const pr = BB[q.inputs.custom_block[1]];',
  '        own = pr && pr.mutation ? String(pr.mutation.proccode) : "?";',
  '        break;',
  '      }',
  '      cur = q.parent;',
  '    }',
  '    if (!own) continue;',
  '    if (own.indexOf("calluser") < 0 && own.indexOf("atom") < 0) continue;',
  '    sites.push(id);',
  '  }',
  '  if (!sites.length) throw new Error("[P339] no tokenize site in calluser/atom");',
  ''
].join('\n');
s = s.slice(0, i0) + lines + s.slice(i1);
// 单站点 -> 循环
const j0 = s.indexOf('  const save = [');
const j1 = s.indexOf('  console.log(');
if (j0 < 0 || j1 < 0) { console.log('MISS single-site block'); process.exit(1); }
const loop = [
  '  const save = [',
  '    clearL("TokSave"),',
  '    setV("tsi", num(1)),',
  '    REPEATU(GT(VAR("tsi"), llen("Tok")), [',
  '      addTo("TokSave", item("Tok", VAR("tsi"))),',
  '      chgV("tsi", num(1))',
  '    ])',
  '  ];',
  '  const restore = [',
  '    setV("tsn", llen("TokSave")),',
  '    setV("tsi", num(1)),',
  '    REPEATU(GT(VAR("tsi"), VAR("tsn")), [',
  '      I("data_replaceitemoflist", {',
  '        fields: B.LISTF("Tok"),',
  '        inputs: { INDEX: B.REP(VAR("tsi"), [4, "0"]), ITEM: B.REP(item("TokSave", VAR("tsi")), [10, ""]) }',
  '      }),',
  '      chgV("tsi", num(1))',
  '    ])',
  '  ];',
  '  let nSite = 0;',
  '  for (const site of sites) {',
  '    try {',
  '      insertBeforeStmt(site, save.slice());',
  '      const a1 = BB[site].next;',
  '      const a2 = a1 ? BB[a1].next : null;',
  '      if (!a2) { console.log("[P339] skip (no room) " + site); continue; }',
  '      spliceAfter(a2, chain(restore));',
  '      nSite++;',
  '    } catch (e) {',
  '      console.log("[P339] skip " + site + " : " + e.message);',
  '    }',
  '  }',
  ''
].join('\n');
s = s.slice(0, j0) + loop + s.slice(j1);
s = s.replace(/console\.log\('\[P339\] Tok is saved[^']*'\);/, 'console.log("[P339] Tok save/restore installed at " + nSite + " site(s)");');
fs.writeFileSync('_work/v41/p339.txt', s);
console.log('rewrote p339 for all sites');

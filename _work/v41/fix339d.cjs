const fs = require('fs');
let s = fs.readFileSync('_work/v41/p339.txt', 'utf8');
// 把"只挑一个站点"改成"收集 calluser / atom 里所有 tokenize 调用"
const from = s.slice(s.indexOf('  // 找 calluser 里 tokenize 调用'), s.indexOf('  if (!site) throw new Error('));
const to = [
  "  // 收集：calluser / atom 里**所有** tokenize 调用（这些是"求值中途换 Tok"的站点）",
  "  const sites = [];",
  "  for (const id of Object.keys(BB)) {",
  "    const b = BB[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation) continue;",
  "    if (String(b.mutation.proccode).indexOf('tokenize') < 0) continue;",
  "    let cur = id, own = '?';",
  "    for (let i = 0; i < 400 && cur; i++) {",
  "      const q = BB[cur];",
  "      if (!q) break;",
  "      if (q.opcode === 'procedures_definition') {",
  "        const pr = BB[q.inputs.custom_block[1]];",
  "        own = pr && pr.mutation ? String(pr.mutation.proccode) : '?';",
  "        break;",
  "      }",
  "      cur = q.parent;",
  "    }",
  "    if (!own) continue;",
  "    if (own.indexOf('calluser') < 0 && own.indexOf('atom') < 0) continue;",
  "    sites.push(id);",
  "  }",
  "  if (!sites.length) throw new Error('[P339] no tokenize site in calluser/atom');",
  ""
].join('\n');
s = s.replace(from, to);
// 把单站点逻辑改成循环
const single = s.slice(s.indexOf("  const save = ["), s.indexOf("  console.log('[P339] Tok is saved"));
const loop = [
  "  const save = [",
  "    clearL('TokSave'),",
  "    setV('tsi', num(1)),",
  "    REPEATU(GT(VAR('tsi'), llen('Tok')), [",
  "      addTo('TokSave', item('Tok', VAR('tsi'))),",
  "      chgV('tsi', num(1))",
  "    ])",
  "  ];",
  "  const restore = [",
  "    setV('tsn', llen('TokSave')),",
  "    setV('tsi', num(1)),",
  "    REPEATU(GT(VAR('tsi'), VAR('tsn')), [",
  "      I('data_replaceitemoflist', {",
  "        fields: B.LISTF('Tok'),",
  "        inputs: { INDEX: B.REP(VAR('tsi'), [4, '0']), ITEM: B.REP(item('TokSave', VAR('tsi')), [10, '']) }",
  "      }),",
  "      chgV('tsi', num(1))",
  "    ])",
  "  ];",
  "  let n = 0;",
  "  for (const site of sites) {",
  "    try {",
  "      insertBeforeStmt(site, save.map((x) => x));",
  "      const a1 = BB[site].next;",
  "      const a2 = a1 ? BB[a1].next : null;",
  "      if (!a2) { console.log('[P339] skip (no room) ' + site); continue; }",
  "      spliceAfter(a2, chain(restore));",
  "      n++;",
  "    } catch (e) {",
  "      console.log('[P339] skip ' + site + ' : ' + e.message);",
  "    }",
  "  }",
  ""
].join('\n');
s = s.replace(single, loop);
s = s.replace("  console.log('[P339] Tok is saved around the lambda tokenize and restored after');", "  console.log('[P339] Tok save/restore installed at ' + n + ' site(s)');");
fs.writeFileSync('_work/v41/p339.txt', s);
console.log('rewrote p339 to handle all sites');
const fs = require('fs');
const p = '_work/v41/p270.txt';
let s = fs.readFileSync(p, 'utf8');
const marker = "  console.log('[P270] unhashable dict key guard installed');";
const extra = [
  "  // ---------- 集合：`setnorm %s (s)` 把\"元素列表\"规范化成集合，逐元素在 ev/evtype 里。",
  "  //            集合字面量 `{a, b}` 走的是 eval → listlit → setnorm（P111），所以守卫放这里最省。",
  "  {",
  "    const sn = reach(defIdOf('setnorm %s'));",
  "    let site = null;",
  "    for (const id of sn) {",
  "      const b = BL()[id];",
  "      if (b.opcode !== 'procedures_call' || !b.mutation) continue;",
  "      if (b.mutation.proccode !== 'listitem %s %s') continue;",
  "      site = id; break;",
  "    }",
  "    if (!site) throw new Error('[P270] setnorm listitem site not found');",
  "    spliceAfter(site, chain([",
  "      IF(OR(EQ(VAR('evtype'), txt('L')), OR(EQ(VAR('evtype'), txt('D')), EQ(VAR('evtype'), txt('E')))), [",
  "        setV('p6v', VAR('ev')), setV('p6t', VAR('evtype')), callProc('tname', []),",
  "        callProc('fail %s', [msg('set element')])",
  "      ])",
  "    ]));",
  "    console.log('[P270] setnorm element guard installed at ' + site);",
  "  }",
  marker
].join('\n');
if (!s.includes(marker)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(marker, extra));
console.log('ok');

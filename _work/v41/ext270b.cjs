const fs = require('fs');
const p = '_work/v41/p270.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 去掉 PZ62 临时探针
s = s.split('\n').filter((l) => !l.includes('PZ62')).join('\n');
// 2) 在 dsetv 守卫那段之后，追加 indexset 的 D 分支守卫
const marker = "  console.log('[P270] unhashable dict key guard installed');";
const extra = [
  "  // ---------- 下标赋值真正走的是 `indexset %s %s (lo,hi)` 的 D 分支：",
  "  //            键的类型在 `isKeyT`，转义后的键文本在 `isKeyE`，字段串在 `isKeyF` 里拼出来。",
  "  {",
  "    const is = reach(defIdOf('indexset %s %s'));",
  "    let site = null;",
  "    for (const id of is) {",
  "      const b = BL()[id];",
  "      if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'isKeyF') { site = id; break; }",
  "    }",
  "    if (!site) throw new Error('[P270] indexset isKeyF site not found');",
  "    insertBeforeStmt(site, [",
  "      IF(OR(EQ(VAR('isKeyT'), txt('L')), OR(EQ(VAR('isKeyT'), txt('D')), EQ(VAR('isKeyT'), txt('E')))), [",
  "        setV('p6v', VAR('isKeyV')), setV('p6t', VAR('isKeyT')), callProc('tname', []),",
  "        callProc('fail %s', [msg('dict key')])",
  "      ])",
  "    ]);",
  "    console.log('[P270] indexset D-branch guard installed at ' + site);",
  "  }",
  marker
].join('\n');
if (!s.includes(marker)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(marker, extra));
console.log('ok');

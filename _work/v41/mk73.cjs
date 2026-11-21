const fs = require('fs');
let s = fs.readFileSync('_work/v41/p310.txt', 'utf8');
// 把第三步（转交 callfn）换成诊断探针
const from = s.slice(s.indexOf("  // (3) calluser"), s.indexOf("  console.log('[P310] calluser dispatches"));
const probe = [
  "  // (3) 诊断：这里只打印 fn/lo/hi 与两端 token",
  "  const cu = reach(defIdOf('calluser %s %s %s'));",
  "  let site = null;",
  "  for (const id of cu) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "    let hit = false;",
  "    const walk = (x, d) => {",
  "      if (!x || d > 12 || typeof x !== 'string' || hit) return;",
  "      const q = BL()[x];",
  "      if (!q) return;",
  "      if (JSON.stringify(q).indexOf('is not defined') >= 0) { hit = true; return; }",
  "      for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') walk(v[1], d + 1);",
  "      walk(q.next, d + 1);",
  "    };",
  "    for (const v of Object.values(b.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') walk(v[1], 0);",
  "    if (!hit) continue;",
  "    site = id; break;",
  "  }",
  "  if (!site) throw new Error('[PZ73] site not found');",
  "  insertBeforeStmt(site, [",
  "    setV('dbg', txt('PZ73 fn=')),",
  "    setV('dbg', JOIN(VAR('dbg'), argOf('fn'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' lo='))),",
  "    setV('dbg', JOIN(VAR('dbg'), argOf('lo'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' hi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), argOf('hi'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' tl='))),",
  "    setV('dbg', JOIN(VAR('dbg'), item('Tok', argOf('lo')))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' th='))),",
  "    setV('dbg', JOIN(VAR('dbg'), item('Tok', argOf('hi')))),",
  "    FAIL(VAR('dbg'))",
  "  ]);",
  ""
].join('\n');
s = s.replace(from, probe).replace("patch('P310 builtin names as values'", "patch('PZ73 builtin registration + dispatch probe'");
if (new Set()).size === 0 && s.indexOf('dbg') > 0 && s.indexOf("newVar('dbg'") < 0) {
  s = s.replace("  newVar('bni', 0);", "  newVar('bni', 0);\n  if (new Set(Object.values(T(IT).variables).map((x) => x[0])).has('dbg')) throw new Error('[PZ73] dbg taken');\n  newVar('dbg', '');");
}
fs.writeFileSync('_work/v41/pz73.txt', s);
console.log('wrote pz73.txt');
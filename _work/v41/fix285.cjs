const fs = require('fs');
const p = '_work/v41/p285.txt';
let s = fs.readFileSync(p, 'utf8');
// (1) 参数名：从 publish 函数体里读第一个 argument_reporter_string_number 的 VALUE
const from1 = s.slice(s.indexOf('  const pubDef = defIdOf'), s.indexOf("  insertBeforeStmt(BL()[pubDef].next, ["));
const to1 = [
  "  const pubDef = defIdOf('publish %s');",
  "  // 参数名不要从 mutation.argumentnames 取（构建器里它是字符串形式），直接从函数体里读参数报告积木。",
  "  let pname = null;",
  "  for (const id of reach(pubDef)) {",
  "    const b = BL()[id];",
  "    if (b.opcode === 'argument_reporter_string_number') { pname = b.fields.VALUE[0]; break; }",
  "  }",
  "  if (!pname) throw new Error('[P285] publish parameter not found');",
  "  console.log('[P285] publish parameter = ' + pname);",
  ""
].join('\n');
if (!from1) { console.log('MISS1'); process.exit(1); }
s = s.replace(from1, to1);
// (2) rebuild：可能有两个候选，取 SUBSTACK 更大（真正的重建循环）
const from2 = "  if (rebuild.length !== 1) throw new Error('[P285] rebuild = ' + rebuild.length);";
const to2 = [
  "  if (!rebuild.length) throw new Error('[P285] rebuild not found');",
  "  rebuild.sort((a, b) => reach(BL()[b].inputs.SUBSTACK[1]).size - reach(BL()[a].inputs.SUBSTACK[1]).size);",
  "  console.log('[P285] rebuild candidates = ' + rebuild.length);",
  ""
].join('\n');
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');

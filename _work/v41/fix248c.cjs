const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from1 = "  const grpIf = find([BL()[scanId].inputs.SUBSTACK[1]], (x) => x.opcode === 'control_if' && x.inputs.CONDITION\n    && BL()[x.inputs.CONDITION[1]] && BL()[x.inputs.CONDITION[1]].opcode === 'operator_contains'\n    && litOf(BL()[x.inputs.CONDITION[1]].inputs.STRING1) === '([{')[0];";
const to1 = [
  "  // 沿循环体链找那个 control_if / aui2 自增（避免用 find([单元素])，那种用法在本项目里不生效）",
  "  let grpIf = null, incAui2 = null;",
  "  {",
  "    let cur = BL()[scanId].inputs.SUBSTACK[1];",
  "    for (let i = 0; i < 40 && cur; i++, cur = BL()[cur].next) {",
  "      const x = BL()[cur];",
  "      if (!grpIf && x.opcode === 'control_if' && x.inputs.CONDITION) {",
  "        const c = BL()[x.inputs.CONDITION[1]];",
  "        if (c && c.opcode === 'operator_contains' && litOf(c.inputs.STRING1) === '([{') grpIf = cur;",
  "      }",
  "      if (!incAui2 && x.opcode === 'data_changevariableby' && x.fields.VARIABLE[0] === 'aui2') incAui2 = cur;",
  "    }",
  "  }"
].join('\n');
const from2 = "  const incAui2 = find([BL()[scanId].inputs.SUBSTACK[1]], (x) => x.opcode === 'data_changevariableby' && x.fields.VARIABLE[0] === 'aui2');\n  if (incAui2.length !== 1) throw new Error('[P248] aui2 inc = ' + incAui2.length);";
if (!s.includes(from1) || !s.includes(from2)) { console.log('MISS'); process.exit(1); }
s = s.replace(from1, to1).replace(from2, "  if (!grpIf || !incAui2) throw new Error('[P248] body lookups: grpIf=' + grpIf + ' incAui2=' + incAui2);");
s = s.replace("  insertBeforeStmt(incAui2[0], [", "  insertBeforeStmt(incAui2, [");
fs.writeFileSync(p, s);
console.log('ok');

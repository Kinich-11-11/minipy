const fs = require('fs');
const p = '_work/v41/p246.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 加入 nearestIf 帮助函数
const anchor = "  const at = (f) => find(all, f);";
const helper = [
  "  const at = (f) => find(all, f);",
  "  const nearestIf = (id) => {",
  "    let cur = id;",
  "    for (let g = 0; g < 80 && cur; g++) {",
  "      const pb = BL()[cur];",
  "      if (pb && (pb.opcode === 'control_if' || pb.opcode === 'control_if_else')) return cur;",
  "      cur = pb ? pb.parent : null;",
  "    }",
  "    return null;",
  "  };"
].join('\n');
if (!s.includes(anchor)) { console.log('MISS1'); process.exit(1); }
s = s.replace(anchor, helper);
// 2) close guard 用 nearestIf
const from2 = "  const closeGuard = BL()[closeSet[0]].parent;";
const to2 = "  const closeGuard = nearestIf(closeSet[0]);";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, to2);
// 3) strip guard 用 nearestIf
const from3 = "  const stripGuard = BL()[at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgc'\n    && b.inputs.VALUE && nameOf(b.inputs.VALUE) === 'xgw')[0]].parent;";
const to3 = "  const stripSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgc'\n    && b.inputs.VALUE && nameOf(b.inputs.VALUE) === 'xgw');\n  if (stripSet.length !== 1) throw new Error('[P246] strip setter = ' + stripSet.length);\n  const stripGuard = nearestIf(stripSet[0]);";
if (!s.includes(from3)) { console.log('MISS3'); process.exit(1); }
s = s.replace(from3, to3);
fs.writeFileSync(p, s);
console.log('ok');

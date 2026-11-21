// P229 增补：进入 assignlist 前清掉可能残留的 error 标志
const fs = require('fs');
const p = '_work/v41/p229.txt';
let s = fs.readFileSync(p, 'utf8');
const old = "  const failBody = BL()[tail].inputs.SUBSTACK2[1];";
const nw = [
  "  // `execute` 里更早的语句分支可能已经试算过一次并留下 `error`，而 `assignlist` 在 RHS eval 之后",
  "  // 有 `if error != \"\": stop this script` —— 残留值会让它静默返回（什么都不绑定）。先清掉。",
  "  const asgCall = one(find(reach(BL()[tail].inputs.SUBSTACK[1]), (b) => b.opcode === 'procedures_call'",
  "    && b.mutation.proccode === 'assignlist %s'), 'assignlist call in tail');",
  "  insertBeforeStmt(asgCall, [setV('error', txt(''))]);",
  "  const failBody = BL()[tail].inputs.SUBSTACK2[1];"
].join('\n');
if (!s.includes(old)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(old, nw));
console.log('patched p229');

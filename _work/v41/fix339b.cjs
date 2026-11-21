const fs = require('fs');
let s = fs.readFileSync('_work/v41/p339.txt', 'utf8');
const from = [
  "    // 沿父链找**任意**一层 IF 条件里含 FnKind 的",
  "    let c2 = id, hit = false;",
  "    for (let i = 0; i < 20 && c2; i++) {",
  "      const q = BB[c2];",
  "      if (!q) break;",
  "      if ((q.opcode === 'control_if' || q.opcode === 'control_if_else') && q.inputs && q.inputs.CONDITION) {",
  "        if (JSON.stringify(q.inputs.CONDITION).indexOf('FnKind') >= 0) { hit = true; break; }",
  "      }",
  "      c2 = q.parent;",
  "    }",
  "    if (!hit) continue;",
  "    site = id; break;"
].join('\n');
const to = [
  "    // 结构性判据：这个 tokenize 的**下一条**就是 `eval %s %s`（lambda 体的求值）",
  "    const nx = BB[id].next;",
  "    const nq = nx ? BB[nx] : null;",
  "    if (!nq || nq.opcode !== 'procedures_call' || !nq.mutation) continue;",
  "    if (String(nq.mutation.proccode) !== 'eval %s %s') continue;",
  "    site = id; break;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p339.txt', s.replace(from, to));
console.log('ok');
const fs = require('fs');
const p = '_work/v41/p310.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    if (JSON.stringify(b).indexOf('is not defined') < 0) continue;";
const to = [
  "    const hasMsg = (() => {",
  "      let hit = false;",
  "      const walk = (x, d) => {",
  "        if (!x || d > 12 || typeof x !== 'string' || hit) return;",
  "        const q = BL()[x];",
  "        if (!q) return;",
  "        if (JSON.stringify(q).indexOf('is not defined') >= 0) { hit = true; return; }",
  "        for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') walk(v[1], d + 1);",
  "        walk(q.next, d + 1);",
  "      };",
  "      for (const v of Object.values(b.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') walk(v[1], 0);",
  "      return hit;",
  "    })();",
  "    if (!hasMsg) continue;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
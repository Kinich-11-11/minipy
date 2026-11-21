const fs = require('fs');
let s = fs.readFileSync('_work/v41/p444.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "  console.log('[P444] lcmp __lt__ via literal token installed');";
const to = [
  "  // 诊断：在 eval 的 `SyntaxError: missing expression` 失败点打印 lo/hi/pc/fi/head",
  "  {",
  "    const textsOf = (v, out) => {",
  "      if (!Array.isArray(v)) return;",
  "      if (v[0] === 12) { if (typeof v[2] === 'string') out.push(v[2]); if (typeof v[1] === 'string') out.push(v[1]); return; }",
  "      if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.push(String(v[1])); return; }",
  "      if (typeof v[1] === 'string' && BB[v[1]]) {",
  "        const w = BB[v[1]];",
  "        if (w.fields && w.fields.VARIABLE) out.push(w.fields.VARIABLE[0]);",
  "        if (w.opcode === 'argument_reporter_string_number' && w.fields && w.fields.VALUE) out.push(w.fields.VALUE[0]);",
  "        for (const x of Object.values(w.inputs || {})) textsOf(x, out);",
  "        return;",
  "      }",
  "      if (Array.isArray(v[1])) textsOf(v[1], out);",
  "    };",
  "    let site = null;",
  "    for (const id of Object.keys(BB)) {",
  "      const q = BB[id];",
  "      if (q.opcode !== 'procedures_call' || !q.mutation) continue;",
  "      if (String(q.mutation.proccode) !== 'fail %s') continue;",
  "      const o = [];",
  "      for (const x of Object.values(q.inputs || {})) textsOf(x, o);",
  "      if (o.join('|').indexOf('parentheses') < 0) continue;",
  "      site = id;",
  "      break;",
  "    }",
  "    if (site) {",
  "      insertBeforeStmt(site, [",
  "        LOGX(JX(txt('MX lo='), argOf('lo'), txt(' hi='), argOf('hi'), txt(' pc='), VAR('pc'), txt(' fi='), VAR('fi'), txt(' head=['), VAR('head'), txt('] count='), VAR('count')))",
  "      ]);",
  "      console.log('[P467] parentheses log at ' + site);",
  "    } else {",
  "      console.log('[P467] parentheses site NOT found');",
  "    }",
  "  }",
  "  console.log('[P468] lcmp dispatch + parentheses diagnostic installed');"
].join('\n');
if (!s.includes(from)) { console.log('ANCHOR MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p468.txt', s.replace(from, to).split('P444').join('P467'));
console.log('p468 written OK');

// Show results of a runall output dir. Usage: node _show.cjs <outdir> [filter]
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const filter = process.argv[3] || '';
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.out.json')).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const arr = Array.isArray(d) ? d : (d.cases || []);
  let fail = 0;
  for (const c of arr) {
    if (!c) continue;
    const same = c.same !== undefined ? c.same : c.pass;
    if (same === false) {
      fail++;
      if (!filter || c.name.includes(filter)) {
        console.log(`FAIL ${c.name}`);
        console.log(`  got:  ${JSON.stringify((c.mini && c.mini.out) || c.out)}`);
        if (c.mini && c.mini.err) console.log(`  err:  ${JSON.stringify(c.mini.err).slice(0, 120)}`);
        console.log(`  want: ${JSON.stringify(c.py || c.expect)}`);
      }
    }
  }
  console.log(`-- ${f}: ${arr.length} cases, ${fail} fail`);
}

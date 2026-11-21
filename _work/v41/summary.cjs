// summary.cjs <casefile.json> <outfile.json> [...]  -> compact failure list
const fs = require('fs');
const files = process.argv.slice(2);
const cap = (s, n) => { s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) + '…' : s; };
for (const f of files) {
  if (f.endsWith('.out.json')) continue;
  const out = f.replace(/\.json$/, '.out.json');
  if (!fs.existsSync(out)) { console.log('MISSING OUT ' + out); continue; }
  const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
  const fails = rows.filter(r => !r.same);
  console.log('=== ' + f + '  total=' + rows.length + ' fail=' + fails.length);
  for (const r of fails) {
    console.log('- [' + r.tag + '] ' + r.name);
    console.log('    mini: ' + cap(JSON.stringify(r.mini.out.join('')), 220) + (r.mini.err ? '  ERR=' + r.mini.err : ''));
    console.log('    cpy : ' + cap(JSON.stringify((r.py || []).join('')), 220) + (r.pyerr ? '  ERR=' + r.pyerr : ''));
  }
}

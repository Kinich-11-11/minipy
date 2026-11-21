const fs = require('fs');
for (const f of ['p605.txt', 'p607.txt', 'p608.txt']) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let bad = -1, msg = '';
  for (let n = 1; n <= lines.length; n++) {
    try { new Function(lines.slice(0, n).join('\n')); }
    catch (e) {
      if (!/Unexpected end of input|missing \) after argument list/.test(e.message) || /Unexpected token|Unexpected identifier|Invalid/.test(e.message)) {
        // an error that is not "incomplete" indicates the region
        bad = n; msg = e.message; break;
      }
      if (/missing \) after argument list/.test(e.message)) { /* incomplete-looking */ }
    }
  }
  if (bad > 0) {
    console.log(f, 'error surfaces at prefix line', bad, '->', msg);
    for (let i = Math.max(0, bad - 4); i < Math.min(lines.length, bad + 1); i++) console.log('   ', i + 1, lines[i].slice(0, 160));
  } else console.log(f, 'no surface point found');
}
